//
//  ExcessorizeEngine.swift
//  The Excessorize recommendation engine. Pure Swift, no dependencies,
//  deterministic, fully unit-testable. See ENGINE.md for the design rationale.
//
//  The JS engine shipped in the PWA (engine.js) is a line-for-line port of this
//  file; keep them in sync.
//

import Foundation

// MARK: - Vocabulary

public enum Category: String, Codable, CaseIterable, Sendable {
    case necklace, earrings, bracelet, ring, watch, bag, belt, scarf, hat, glasses
}

/// 12-hue wheel + neutrals. Small vocabulary on purpose (PRD risk mitigation).
public enum ColorFamily: String, Codable, CaseIterable, Sendable {
    case red, orange, yellow, chartreuse, green, teal, blue, indigo, violet, magenta, pink, brown
    case black, white, grey, cream, tan // neutrals

    public var isNeutral: Bool {
        switch self {
        case .black, .white, .grey, .cream, .tan: return true
        default: return false
        }
    }

    /// Position on a 12-step hue wheel; nil for neutrals.
    var hueIndex: Int? {
        switch self {
        case .red: return 0
        case .orange: return 1
        case .yellow: return 2
        case .chartreuse: return 3
        case .green: return 4
        case .teal: return 5
        case .blue: return 6
        case .indigo: return 7
        case .violet: return 8
        case .magenta: return 9
        case .pink: return 10
        case .brown: return 1 // brown behaves as dark orange
        default: return nil
        }
    }
}

public enum Tone: String, Codable, Sendable { case warm, cool, neutral }
public enum ColorValue: String, Codable, Sendable { case light, mid, dark }
public enum Metal: String, Codable, Sendable { case gold, silver, roseGold, mixed, none }
public enum Season: String, Codable, CaseIterable, Sendable { case spring, summer, autumn, winter }

public enum StyleArchetype: String, Codable, CaseIterable, Sendable {
    case minimal, classic, romantic, boho, street, glam, sporty, edgy
}

public enum Occasion: String, Codable, Sendable {
    case everyday, work, dateNight, formal, travel, gym, beach
}

public enum Neckline: String, Codable, Sendable { case vneck, scoop, crew, high, collared, strapless }

public struct ColorTag: Codable, Equatable, Sendable {
    public var family: ColorFamily
    public var tone: Tone
    public var value: ColorValue
    public var weight: Double // dominance 0...1 (outfit colors); 1 for accessories

    public init(_ family: ColorFamily, tone: Tone = .neutral, value: ColorValue = .mid, weight: Double = 1) {
        self.family = family; self.tone = tone; self.value = value; self.weight = weight
    }
}

// MARK: - Entities

public struct Accessory: Codable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var category: Category
    public var colors: [ColorTag]
    public var metal: Metal
    public var formality: Int      // 1...5
    public var statement: Int      // 1...5  ("excess" axis)
    public var styles: Set<StyleArchetype>
    public var seasons: Set<Season>
    public var price: Double?      // future monetary budget; unused in v1 ranking
    public var timesWorn: Int
    public var lastWornDaysAgo: Int?
    public var favorite: Bool

    public init(id: String, name: String, category: Category, colors: [ColorTag],
                metal: Metal = .none, formality: Int = 3, statement: Int = 2,
                styles: Set<StyleArchetype> = [.classic], seasons: Set<Season> = Set(Season.allCases),
                price: Double? = nil, timesWorn: Int = 0, lastWornDaysAgo: Int? = nil, favorite: Bool = false) {
        self.id = id; self.name = name; self.category = category; self.colors = colors
        self.metal = metal; self.formality = formality; self.statement = statement
        self.styles = styles; self.seasons = seasons; self.price = price
        self.timesWorn = timesWorn; self.lastWornDaysAgo = lastWornDaysAgo; self.favorite = favorite
    }

    public var tier: Tier { statement >= 4 ? .excess : (statement == 3 ? .elevate : .anchor) }
}

public enum Tier: String, Codable, Sendable { case anchor, elevate, excess }

public struct OutfitRead: Codable, Sendable {
    public var garments: [String]
    public var colors: [ColorTag]              // weighted by dominance
    public var formality: Int                  // 1...5
    public var styleRead: [StyleArchetype: Double]
    public var neckline: Neckline?
    public var occasion: Occasion?
    public var season: Season?
    public var confidence: Double              // 0...1
    public var altRead: AltRead?               // second interpretation when ambiguous

    public struct AltRead: Codable, Sendable {
        public var formality: Int
        public var styleRead: [StyleArchetype: Double]
        public init(formality: Int, styleRead: [StyleArchetype: Double]) {
            self.formality = formality; self.styleRead = styleRead
        }
    }

    public init(garments: [String] = [], colors: [ColorTag], formality: Int,
                styleRead: [StyleArchetype: Double] = [:], neckline: Neckline? = nil,
                occasion: Occasion? = nil, season: Season? = nil,
                confidence: Double = 1.0, altRead: AltRead? = nil) {
        self.garments = garments; self.colors = colors; self.formality = formality
        self.styleRead = styleRead; self.neckline = neckline; self.occasion = occasion
        self.season = season; self.confidence = confidence; self.altRead = altRead
    }
}

public struct UserPrefs: Codable, Sendable {
    public var boldness: Double                // 0 subtle ... 1 excess
    public var metalPreference: Metal?
    public var avoidColors: Set<ColorFamily>
    public var favoriteStyles: Set<StyleArchetype>
    public var maxPieces: Int

    public init(boldness: Double = 0.5, metalPreference: Metal? = nil,
                avoidColors: Set<ColorFamily> = [], favoriteStyles: Set<StyleArchetype> = [],
                maxPieces: Int = 4) {
        self.boldness = boldness; self.metalPreference = metalPreference
        self.avoidColors = avoidColors; self.favoriteStyles = favoriteStyles
        self.maxPieces = max(1, maxPieces)
    }

    public var statementBudget: Int { 4 + Int((boldness * 6).rounded()) }
}

// MARK: - Result types

public struct Recommendation: Codable, Sendable {
    public var item: Accessory
    public var score: Double
    public var tier: Tier
    public var rationale: String
    public var termBreakdown: [String: Double]  // transparency: each term's weighted value
}

public struct EngineResult: Codable, Sendable {
    public enum EmptyReason: String, Codable, Sendable { case emptyCloset, allVetoed, none }
    public var picks: [Recommendation]
    public var alternates: [Recommendation]     // next-best per category, for "swap"
    public var relaxed: [String]                // which constraint rungs were loosened
    public var emptyReason: EmptyReason
    public var askToConfirmOutfit: Bool         // low-confidence read: UI should confirm
}

// MARK: - Engine

public struct RecommendationEngine: Sendable {

    public init() {}

    // Weights sum to 1.0 — see ENGINE.md §2.1. ⚑ hand-set; learn from feedback later.
    static let wColor = 0.30, wFormality = 0.20, wMetal = 0.15
    static let wStyle = 0.15, wCategory = 0.10, wPersonal = 0.10
    static let mmrLambda = 0.5
    static let minShowScore = 0.42   // below this, no credible rationale exists → hide

    // MARK: Public API

    public func recommend(outfit: OutfitRead, closet: [Accessory], prefs: UserPrefs = UserPrefs()) -> EngineResult {
        guard !closet.isEmpty else {
            return EngineResult(picks: [], alternates: [], relaxed: [],
                                emptyReason: .emptyCloset, askToConfirmOutfit: false)
        }

        let ambiguous = outfit.confidence < 0.6 && outfit.altRead != nil
        var relaxed: [String] = []

        // Relaxation ladder: §2.5
        var candidates = closet.filter { passesHardRules($0, outfit: outfit, prefs: prefs, maxFormalityGap: 2, useSeason: true, useOccasion: true) }
        if candidates.isEmpty {
            candidates = closet.filter { passesHardRules($0, outfit: outfit, prefs: prefs, maxFormalityGap: 3, useSeason: true, useOccasion: true) }
            if !candidates.isEmpty { relaxed.append("formality") }
        }
        if candidates.isEmpty {
            candidates = closet.filter { passesHardRules($0, outfit: outfit, prefs: prefs, maxFormalityGap: 3, useSeason: false, useOccasion: true) }
            if !candidates.isEmpty { relaxed.append("season") }
        }
        if candidates.isEmpty {
            candidates = closet.filter { passesHardRules($0, outfit: outfit, prefs: prefs, maxFormalityGap: 3, useSeason: false, useOccasion: false) }
            if !candidates.isEmpty { relaxed.append("occasion") }
        }
        guard !candidates.isEmpty else {
            return EngineResult(picks: [], alternates: [], relaxed: relaxed,
                                emptyReason: .allVetoed, askToConfirmOutfit: ambiguous)
        }

        // Greedy MMR set composition under statement budget: §2.2
        var picked: [Recommendation] = []
        var pool = candidates
        var budget = relaxed.contains("occasion") ? Int.max : prefs.statementBudget
        var excessUsed = false

        while picked.count < prefs.maxPieces, !pool.isEmpty {
            var best: (acc: Accessory, adj: Double, scored: ScoredTerms)? = nil
            for a in pool {
                guard slotEligible(a, picked: picked.map(\.item)) else { continue }
                if a.statement > budget { continue }
                if a.tier == .excess && excessUsed { continue }
                let s = scoreItem(a, outfit: outfit, prefs: prefs, set: picked.map(\.item), ambiguous: ambiguous)
                guard s.total >= Self.minShowScore else { continue }
                let adj = s.total - Self.mmrLambda * maxSimilarity(a, to: picked.map(\.item))
                if best == nil || adj > best!.adj { best = (a, adj, s) }
            }
            guard let chosen = best else { break }
            budget -= (budget == Int.max ? 0 : chosen.acc.statement)
            if chosen.acc.tier == .excess { excessUsed = true }
            picked.append(Recommendation(item: chosen.acc,
                                         score: round3(chosen.scored.total),
                                         tier: chosen.acc.tier,
                                         rationale: rationale(for: chosen.acc, terms: chosen.scored, outfit: outfit),
                                         termBreakdown: chosen.scored.breakdown))
            pool.removeAll { $0.id == chosen.acc.id }
        }

        // Alternates: best remaining item per picked category (drives "swap")
        var alternates: [Recommendation] = []
        for cat in Set(picked.map(\.item.category)) {
            let alt = pool.filter { $0.category == cat }
                .map { ($0, scoreItem($0, outfit: outfit, prefs: prefs, set: [], ambiguous: ambiguous)) }
                .filter { $0.1.total >= Self.minShowScore }
                .max { $0.1.total < $1.1.total }
            if let (a, s) = alt {
                alternates.append(Recommendation(item: a, score: round3(s.total), tier: a.tier,
                                                 rationale: rationale(for: a, terms: s, outfit: outfit),
                                                 termBreakdown: s.breakdown))
            }
        }

        return EngineResult(picks: picked, alternates: alternates, relaxed: relaxed,
                            emptyReason: picked.isEmpty ? .allVetoed : .none,
                            askToConfirmOutfit: ambiguous)
    }

    // MARK: Hard rules  (§1.4)

    func passesHardRules(_ a: Accessory, outfit: OutfitRead, prefs: UserPrefs,
                         maxFormalityGap: Int, useSeason: Bool, useOccasion: Bool) -> Bool {
        if a.colors.contains(where: { prefs.avoidColors.contains($0.family) }) { return false } // never relaxed
        if abs(a.formality - outfit.formality) > maxFormalityGap { return false }
        if useSeason, let s = outfit.season, !a.seasons.contains(s), !a.seasons.isEmpty { return false }
        if useOccasion, let occ = outfit.occasion {
            if occ == .gym && a.statement >= 4 { return false }
            if occ == .gym && ![.watch, .bag, .hat, .glasses, .bracelet].contains(a.category) { return false }
            if occ == .formal && a.styles == [.sporty] { return false }
        }
        return true
    }

    func slotEligible(_ a: Accessory, picked: [Accessory]) -> Bool {
        let sameCat = picked.filter { $0.category == a.category }
        switch a.category {
        case .necklace:
            // layering exception: two necklaces ok if both statement ≤ 2
            if sameCat.isEmpty { return true }
            return sameCat.count == 1 && a.statement <= 2 && sameCat[0].statement <= 2
        case .watch, .bracelet:
            let wrist = picked.filter { $0.category == .watch || $0.category == .bracelet }
            if a.category == .watch && picked.contains(where: { $0.category == .watch }) { return false }
            return wrist.count < 2
        default:
            return sameCat.isEmpty
        }
    }

    // MARK: Scoring  (§2.1)

    struct ScoredTerms {
        var color = 0.0, formality = 0.0, metal = 0.0, style = 0.0, category = 0.0, personal = 0.0, penalty = 0.0
        var total = 0.0
        var breakdown: [String: Double] {
            ["color": color, "formality": formality, "metal": metal,
             "style": style, "category": category, "personal": personal, "penalty": -penalty]
        }
    }

    func scoreItem(_ a: Accessory, outfit: OutfitRead, prefs: UserPrefs,
                   set: [Accessory], ambiguous: Bool) -> ScoredTerms {
        var t = scoreOnce(a, formality: outfit.formality, styleRead: outfit.styleRead,
                          outfit: outfit, prefs: prefs, set: set)
        if ambiguous, let alt = outfit.altRead {
            // maximin over both reads: robust core rises (§2.4)
            let t2 = scoreOnce(a, formality: alt.formality, styleRead: alt.styleRead,
                               outfit: outfit, prefs: prefs, set: set)
            if t2.total < t.total { t = t2 }
        }
        return t
    }

    private func scoreOnce(_ a: Accessory, formality: Int, styleRead: [StyleArchetype: Double],
                           outfit: OutfitRead, prefs: UserPrefs, set: [Accessory]) -> ScoredTerms {
        var t = ScoredTerms()
        t.color = Self.wColor * colorHarmony(a.colors, outfit.colors)
        t.formality = Self.wFormality * (1.0 - Double(abs(a.formality - formality)) / 4.0)
        t.metal = Self.wMetal * metalConsistency(a.metal, set: set, pref: prefs.metalPreference)
        t.style = Self.wStyle * styleAffinity(a.styles, outfitRead: styleRead, userFavs: prefs.favoriteStyles)
        t.category = Self.wCategory * (categoryPrior(a.category, outfit: outfit) / 1.25)
        t.personal = Self.wPersonal * personalization(a)
        if let s = outfit.season, !a.seasons.contains(s), !a.seasons.isEmpty { t.penalty = 0.15 }
        t.total = t.color + t.formality + t.metal + t.style + t.category + t.personal - t.penalty
        return t
    }

    /// §2.1 C-term. Weighted max over outfit colors.
    func colorHarmony(_ accColors: [ColorTag], _ outfitColors: [ColorTag]) -> Double {
        guard !accColors.isEmpty, !outfitColors.isEmpty else { return 0.5 }
        var best = 0.0
        let totalW = outfitColors.reduce(0) { $0 + $1.weight }
        for oc in outfitColors {
            for ac in accColors {
                var pair: Double
                if oc.family.isNeutral || ac.family.isNeutral {
                    pair = 0.70
                } else if oc.family == ac.family {
                    pair = 0.85
                } else if let h1 = oc.family.hueIndex, let h2 = ac.family.hueIndex {
                    let d = min(abs(h1 - h2), 12 - abs(h1 - h2))
                    switch d {
                    case 1: pair = 0.80      // analogous
                    case 6: pair = 0.90      // complementary
                    case 4: pair = 0.75      // triadic
                    default: pair = 0.35     // clash-ish
                    }
                } else { pair = 0.5 }
                if ac.tone != .neutral && ac.tone == oc.tone { pair = min(1.0, pair + 0.10) }
                let dominance = totalW > 0 ? oc.weight / totalW : 1.0
                best = max(best, pair * (0.6 + 0.4 * dominance))
            }
        }
        return best
    }

    func metalConsistency(_ metal: Metal, set: [Accessory], pref: Metal?) -> Double {
        if metal == .none { return 1.0 }
        let setMetals = Set(set.map(\.metal).filter { $0 != .none && $0 != .mixed })
        let anchor: Metal? = setMetals.count == 1 ? setMetals.first : (set.isEmpty ? pref : nil)
        if metal == .mixed { return 0.6 }
        guard let anchor else { return setMetals.isEmpty ? 0.9 : 0.4 }
        if anchor == .mixed { return 0.8 }
        return metal == anchor ? 1.0 : 0.2
    }

    func styleAffinity(_ styles: Set<StyleArchetype>, outfitRead: [StyleArchetype: Double],
                       userFavs: Set<StyleArchetype>) -> Double {
        guard !styles.isEmpty else { return 0.5 }
        var blended: [StyleArchetype: Double] = [:]
        for arch in StyleArchetype.allCases {
            let o = outfitRead[arch] ?? 0
            let u = userFavs.contains(arch) ? 1.0 : 0.0
            blended[arch] = 0.7 * o + 0.3 * u
        }
        let norm = blended.values.reduce(0, +)
        guard norm > 0 else { return 0.5 }
        let hit = styles.reduce(0.0) { $0 + (blended[$1] ?? 0) }
        return min(1.0, hit / norm * Double(max(1, blended.count / max(1, styles.count))) * 0.5 + hit / norm * 0.5)
    }

    /// §1.5 — authored priors. ⚑ re-fit from acceptance data.
    func categoryPrior(_ cat: Category, outfit: OutfitRead) -> Double {
        var p = 1.0
        if let neck = outfit.neckline {
            switch (neck, cat) {
            case (.vneck, .necklace), (.scoop, .necklace), (.strapless, .necklace): p = 1.25
            case (.high, .necklace): p = 0.35
            case (.high, .earrings), (.crew, .earrings): p = 1.15
            case (.collared, .necklace): p = 0.8
            default: break
            }
        }
        let g = outfit.garments.map { $0.lowercased() }
        if cat == .belt, g.contains(where: { $0.contains("dress") }) { p = max(p, 1.2) }
        if cat == .scarf, outfit.season == .winter || g.contains(where: { $0.contains("coat") }) { p = max(p, 1.25) }
        if cat == .bag { p = max(p, 1.1) }
        if cat == .hat, outfit.occasion == .formal { p = min(p, 0.6) }
        return p
    }

    func personalization(_ a: Accessory) -> Double {
        var p = 0.5
        if a.favorite { p += 0.3 }
        if let d = a.lastWornDaysAgo {
            if d >= 30 { p += 0.2 }        // rotation nudge: PRD core promise
            else if d <= 3 { p -= 0.2 }
        } else if a.timesWorn == 0 {
            p += 0.2                        // never worn → novelty
        }
        return min(1.0, max(0.0, p))
    }

    func maxSimilarity(_ a: Accessory, to set: [Accessory]) -> Double {
        var m = 0.0
        for b in set {
            var s = 0.0
            if a.category == b.category { s = 1.0 }
            else if let af = a.colors.first?.family, let bf = b.colors.first?.family, af == bf, !af.isNeutral { s = 0.4 }
            else if a.tier == b.tier { s = 0.3 }
            m = max(m, s)
        }
        return m
    }

    // MARK: Rationale  (§2.3 — authored templates, top-2 terms)

    func rationale(for a: Accessory, terms: ScoredTerms, outfit: OutfitRead) -> String {
        let ranked = terms.breakdown.filter { $0.key != "penalty" }.sorted { $0.value > $1.value }
        var parts: [String] = []
        for (key, _) in ranked.prefix(2) {
            switch key {
            case "color":
                if let oc = outfit.colors.max(by: { $0.weight < $1.weight }) {
                    if let af = a.colors.first?.family, af == oc.family {
                        parts.append("echoes the \(oc.family.rawValue) running through this outfit")
                    } else if let af = a.colors.first?.family, af.isNeutral {
                        parts.append("\(af.rawValue) stays neutral against the \(oc.family.rawValue)")
                    } else {
                        let acN = a.colors.first?.family.rawValue ?? "its color"
                        parts.append("\(acN) plays off the \(oc.family.rawValue) in this outfit")
                    }
                }
            case "formality":
                parts.append("sits at the same dress level as the look")
            case "metal":
                parts.append(a.metal == .none ? "keeps the metals uncluttered" : "keeps the metals consistent")
            case "style":
                if let s = a.styles.first { parts.append("matches the \(s.rawValue) read of the outfit") }
            case "category":
                parts.append("this outfit has room for a \(a.category.rawValue)")
            case "personal":
                parts.append(a.favorite ? "one of your favorites" : "you haven't worn this in a while")
            default: break
            }
        }
        let joined = parts.joined(separator: ", and ")
        return joined.isEmpty ? "a safe pairing for this look" : joined.prefix(1).uppercased() + joined.dropFirst() + "."
    }

    private func round3(_ x: Double) -> Double { (x * 1000).rounded() / 1000 }
}
