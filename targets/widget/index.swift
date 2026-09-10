import WidgetKit
import SwiftUI

// Deles med appen via App Group. Appen skriver, widget'en laeser.
private let appGroup = "group.dk.mo.madhakka"
private let noegle = "dagsstatus"

struct Opgave: Codable, Identifiable {
    var id: String
    var tekst: String
    var done: Bool
}

struct Dagsstatus: Codable {
    var dato: String
    var opgaver: [Opgave]
    var streak: Int
}

private func laesStatus() -> Dagsstatus? {
    guard
        let defaults = UserDefaults(suiteName: appGroup),
        let raa = defaults.string(forKey: noegle),
        let data = raa.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(Dagsstatus.self, from: data)
}

struct Indgang: TimelineEntry {
    let date: Date
    let status: Dagsstatus?
}

struct Udbyder: TimelineProvider {
    func placeholder(in context: Context) -> Indgang {
        Indgang(date: Date(), status: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (Indgang) -> Void) {
        completion(Indgang(date: Date(), status: laesStatus()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Indgang>) -> Void) {
        let nu = Date()
        // Appen kalder reloadWidget ved aendringer. Timeren er kun et sikkerhedsnet.
        let naeste = Calendar.current.date(byAdding: .hour, value: 1, to: nu) ?? nu
        let indgang = Indgang(date: nu, status: laesStatus())
        completion(Timeline(entries: [indgang], policy: .after(naeste)))
    }
}

struct WidgetIndhold: View {
    @Environment(\.widgetFamily) private var family
    let indgang: Indgang

    private var uklarede: [Opgave] {
        (indgang.status?.opgaver ?? []).filter { !$0.done }
    }

    private var klarede: Int {
        (indgang.status?.opgaver ?? []).filter { $0.done }.count
    }

    private var ialt: Int {
        indgang.status?.opgaver.count ?? 0
    }

    var body: some View {
        if let status = indgang.status {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(status.dato)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Spacer()
                    if status.streak > 0 {
                        Text("\(status.streak)")
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(.tint)
                    }
                }

                if uklarede.isEmpty {
                    Text(ialt == 0 ? "Ingen opgaver" : "Alt klaret")
                        .font(.subheadline.weight(.medium))
                } else {
                    ForEach(uklarede.prefix(family == .systemSmall ? 2 : 4)) { opgave in
                        HStack(alignment: .top, spacing: 5) {
                            Image(systemName: "circle")
                                .font(.system(size: 9))
                                .foregroundStyle(.secondary)
                                .padding(.top, 3)
                            Text(opgave.tekst)
                                .font(.caption)
                                .lineLimit(family == .systemSmall ? 1 : 2)
                        }
                    }
                }

                Spacer(minLength: 0)

                if ialt > 0 {
                    Text("\(klarede) af \(ialt) klaret")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Text("Dagligt")
                    .font(.subheadline.weight(.medium))
                Text("Åbn appen for at komme i gang")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct DagWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DagWidget", provider: Udbyder()) { indgang in
            WidgetIndhold(indgang: indgang)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Dagligt")
        .description("Dagens uklarede opgaver og din streak.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct DagWidgetBundle: WidgetBundle {
    var body: some Widget {
        DagWidget()
    }
}
