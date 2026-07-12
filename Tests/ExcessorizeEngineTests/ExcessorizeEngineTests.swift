import XCTest
@testable import ExcessorizeEngine

final class ExcessorizeEngineTests: XCTestCase {

    let engine = RecommendationEngine()

    // MARK: fixtures

    func makeCloset() -> [Accessory] {
        [
            Accessory(id: "gold-chain", name: "Thin gold chain", category: .necklace,
                      colors: [ColorTag(.tan, tone: .warm, value: .light)], metal: .gold,
                      formality: 3, statement: 1, styles: [.minimal, .classic]),
            Accessory(id: "collar", name: "Sculptural collar necklace", category: .necklace,
                      colors: [ColorTag(.tan, tone: .warm)], metal: .gold,
                      formality: 4, statement: 5, styles: [.glam, .edgy]),
            Accessory(id: "hoops", name: "Gold hoops", category: .earrings,
                      colors: [ColorTag(.tan, tone: .warm)], metal: .gold,
                      formality: 3, statement: 2, styles: [.classic, .glam], favorite: true),
            Accessory(id: "silver-studs", name: "Silver studs", category: .earrings,
                      colors: [ColorTag(.grey, tone: .cool)], metal: .silver,
                      formality: 3, statement: 1, styles: [.minimal]),
            Accessory(id: "tan-bag", name: "Tan leather tote", category: .bag,
                      colors: [ColorTag(.tan, tone: .warm)], metal: .none,
                      formality: 3, statement: 2, styles: [.classic], lastWornDaysAgo: 45),
            Accessory(id: "black-belt", name: "Black leather belt", category: .belt,
                      colors: [ColorTag(.black)], metal: .silver,
                      formality: 3, statement: 1, styles: [.classic, .minimal]),
            Accessory(id: "silk-scarf", name: "Teal silk scarf", category: .scarf,
                      colors: [ColorTag(.teal, tone: .cool)], metal: .none,
                      formality: 4, statement: 3, styles: [.romantic, .classic],
                      seasons: [.autumn, .winter, .spring]),
            Accessory(id: "sport-watch", name: "Rubber sport watch", category: .watch,
                      colors: [ColorTag(.black)], metal: .none,
                      formality: 1, statement: 2, styles: [.sporty]),
        ]
    }

    func casualWarmOutfit() -> OutfitRead {
        OutfitRead(garments: ["tan jacket", "white tee", "jeans"],
                   colors: [ColorTag(.tan, tone: .warm, weight: 0.6),
                            ColorTag(.blue, tone: .cool, weight: 0.3),
                            ColorTag(.white, weight: 0.1)],
                   formality: 3,
                   styleRead: [.classic: 0.6, .minimal: 0.4],
                   neckline: .crew, occasion: .everyday, season: .autumn, confidence: 0.9)
    }

    // MARK: happy path

    func testRecommendsFromOwnedItemsOnly() {
        let closet = makeCloset()
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: closet)
        XCTAssertFalse(r.picks.isEmpty)
        let ids = Set(closet.map(\.id))
        for p in r.picks { XCTAssertTrue(ids.contains(p.item.id)) }
        XCTAssertEqual(r.emptyReason, .none)
    }

    func testEveryPickHasARationale() {
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: makeCloset())
        for p in r.picks {
            XCTAssertFalse(p.rationale.isEmpty, "PRD: no credible reason → no suggestion")
            XCTAssertGreaterThanOrEqual(p.score, 0.42)
        }
    }

    func testNoDuplicateExclusiveSlots() {
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: makeCloset(),
                                 prefs: UserPrefs(boldness: 1.0, maxPieces: 6))
        let bags = r.picks.filter { $0.item.category == .bag }
        let belts = r.picks.filter { $0.item.category == .belt }
        XCTAssertLessThanOrEqual(bags.count, 1)
        XCTAssertLessThanOrEqual(belts.count, 1)
    }

    func testScoresAreOrderedDescendingByGreedyPick() {
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: makeCloset())
        // greedy-MMR does not guarantee strict score ordering, but first pick is max-score
        let maxScore = r.picks.map(\.score).max() ?? 0
        XCTAssertEqual(r.picks.first!.score, maxScore, accuracy: 0.001)
    }

    // MARK: excess tiers / boldness budget

    func testSubtleUserGetsNoExcessPiece() {
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: makeCloset(),
                                 prefs: UserPrefs(boldness: 0.0))
        XCTAssertFalse(r.picks.contains { $0.tier == .excess },
                       "boldness 0 → statement budget 4 → no statement-5 collar")
    }

    func testBoldUserCanGetAtMostOneExcessPiece() {
        var outfit = casualWarmOutfit()
        outfit.formality = 4
        let r = engine.recommend(outfit: outfit, closet: makeCloset(),
                                 prefs: UserPrefs(boldness: 1.0, maxPieces: 5))
        XCTAssertLessThanOrEqual(r.picks.filter { $0.tier == .excess }.count, 1)
    }

    // MARK: edge case — empty / no matches

    func testEmptyClosetReturnsEmptyReason() {
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: [])
        XCTAssertTrue(r.picks.isEmpty)
        XCTAssertEqual(r.emptyReason, .emptyCloset)
    }

    func testAvoidedColorsAreNeverRelaxed() {
        let closet = [Accessory(id: "x", name: "Teal scarf", category: .scarf,
                                colors: [ColorTag(.teal, tone: .cool)], formality: 3, statement: 2)]
        let prefs = UserPrefs(avoidColors: [.teal])
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: closet, prefs: prefs)
        XCTAssertTrue(r.picks.isEmpty)
        XCTAssertEqual(r.emptyReason, .allVetoed)
    }

    // MARK: edge case — conflicting constraints → relaxation ladder

    func testFormalityConflictRelaxesAndReports() {
        // closet is all formality 5, outfit formality 1 → gap 4 → even rung 1 fails,
        // ladder ends at occasion rung; formality gap 3 still vetoes, so allVetoed... 
        // use gap 3 items so rung 1 (gap 2→3) rescues them.
        let closet = [Accessory(id: "d", name: "Diamond drops", category: .earrings,
                                colors: [ColorTag(.white)], metal: .silver,
                                formality: 5, statement: 3, styles: [.glam])]
        var outfit = casualWarmOutfit()
        outfit.formality = 2
        let r = engine.recommend(outfit: outfit, closet: closet)
        XCTAssertFalse(r.picks.isEmpty, "gap of 3 should be rescued by relaxation rung 1")
        XCTAssertTrue(r.relaxed.contains("formality"), "engine must report what it loosened")
    }

    func testGymOccasionVetoesStatementJewelry() {
        var outfit = casualWarmOutfit()
        outfit.occasion = .gym
        outfit.formality = 1
        let r = engine.recommend(outfit: outfit, closet: makeCloset(),
                                 prefs: UserPrefs(boldness: 1.0))
        XCTAssertFalse(r.picks.contains { $0.item.id == "collar" })
        XCTAssertFalse(r.picks.contains { $0.item.category == .scarf })
    }

    // MARK: edge case — ambiguous outfit (maximin)

    func testAmbiguousOutfitPrefersRobustItems() {
        var outfit = casualWarmOutfit()
        outfit.confidence = 0.4
        outfit.altRead = OutfitRead.AltRead(formality: 5, styleRead: [.glam: 1.0])
        let r = engine.recommend(outfit: outfit, closet: makeCloset())
        XCTAssertTrue(r.askToConfirmOutfit, "low confidence must surface a confirm prompt")
        // sport watch (formality 1) collapses under the formal read; must not lead
        XCTAssertNotEqual(r.picks.first?.item.id, "sport-watch")
    }

    // MARK: metal consistency

    func testMetalsStayConsistentWithinASet() {
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: makeCloset(),
                                 prefs: UserPrefs(metalPreference: .gold, maxPieces: 4))
        let metals = Set(r.picks.map(\.item.metal).filter { $0 == .gold || $0 == .silver })
        XCTAssertLessThanOrEqual(metals.count, 1, "should not mix gold and silver leads")
    }

    // MARK: season

    func testSeasonMismatchFiltersScarfInSummer() {
        var outfit = casualWarmOutfit()
        outfit.season = .summer
        let r = engine.recommend(outfit: outfit, closet: makeCloset())
        XCTAssertFalse(r.picks.contains { $0.item.id == "silk-scarf" },
                       "scarf not tagged for summer should not appear without relaxation")
        XCTAssertFalse(r.relaxed.contains("season"))
    }

    // MARK: alternates for "swap"

    func testAlternatesOfferDifferentItemSameCategory() {
        let r = engine.recommend(outfit: casualWarmOutfit(), closet: makeCloset())
        let pickedIds = Set(r.picks.map(\.item.id))
        for alt in r.alternates {
            XCTAssertFalse(pickedIds.contains(alt.item.id))
            XCTAssertTrue(r.picks.contains { $0.item.category == alt.item.category })
        }
    }
}
