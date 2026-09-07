import Foundation

// Shared by every legacy view in the host process. A start on any display must
// invalidate exits requested by all other displays, including repeated stops.
final class DelayedHostExit {
    private var pending: DispatchWorkItem?
    private var generation: UInt = 0
    private let schedule: (DispatchWorkItem) -> Void
    private let action: () -> Void
    init(schedule: @escaping (DispatchWorkItem) -> Void, action: @escaping () -> Void) {
        self.schedule = schedule; self.action = action
    }
    func cancel() {
        generation &+= 1
        pending?.cancel(); pending = nil
    }
    func request() {
        cancel()
        let token = generation
        let work = DispatchWorkItem { [weak self] in
            guard let self = self, self.generation == token else { return }
            self.pending = nil
            self.action()
        }
        pending = work
        schedule(work)
    }
}
