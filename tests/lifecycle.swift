import Foundation
@main struct LifecycleTests {
    static func main() {
        var queued: [DispatchWorkItem] = []
        var exits = 0
        let coordinator = DelayedHostExit(schedule: { queued.append($0) }, action: { exits += 1 })
        coordinator.request(); coordinator.request()
        queued[0].perform(); precondition(exits == 0, "Older stop must not exit")
        coordinator.cancel() // Start on a different display cancels all pending work.
        queued[1].perform(); precondition(exits == 0, "A restart must cancel every exit")
        coordinator.request(); queued[2].perform()
        precondition(exits == 1, "A real stop should exit exactly once")
        print("PASS: repeated stops, cross-display restart, and normal delayed exit")
    }
}
