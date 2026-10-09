import AVFoundation
import Foundation
import Observation

/// Playlist BGM matching the web `audio.js` tracks.
@Observable
@MainActor
final class BackgroundMusic {
    static let shared = BackgroundMusic()

    private(set) var isMuted: Bool
    private var player: AVAudioPlayer?
    private var trackIndex = 0
    private var started = false
    private let targetVolume: Float = 0.55
    private let tracks = ["space_adventure", "space_city", "simplest_synthwave"]
    private let finishDelegate = FinishDelegate()

    private init() {
        isMuted = UserDefaults.standard.bool(forKey: Self.muteKey)
        finishDelegate.onFinish = { [weak self] in
            Task { @MainActor in self?.advanceTrack() }
        }
    }

    private static let muteKey = "bgmMuted"

    func start() {
        started = true
        activateSession()
        if player == nil {
            loadTrack(trackIndex, autoplay: true)
        } else {
            player?.volume = isMuted ? 0 : targetVolume
            player?.play()
        }
    }

    func stop() {
        started = false
        player?.stop()
        player = nil
        trackIndex = 0
    }

    @discardableResult
    func toggleMute() -> Bool {
        isMuted.toggle()
        UserDefaults.standard.set(isMuted, forKey: Self.muteKey)
        player?.volume = isMuted ? 0 : targetVolume
        return isMuted
    }

    private func activateSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            // `.playback` so music plays even with the Ring/Silent switch on.
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            // Keep going — play() will no-op if the session fails.
        }
    }

    private func loadTrack(_ index: Int, autoplay: Bool) {
        guard tracks.indices.contains(index) else { return }
        trackIndex = index
        guard let url = trackURL(tracks[index]) else { return }
        do {
            let next = try AVAudioPlayer(contentsOf: url)
            next.delegate = finishDelegate
            next.volume = isMuted ? 0 : targetVolume
            next.prepareToPlay()
            player = next
            if autoplay {
                next.play()
            }
        } catch {
            let fallback = (index + 1) % tracks.count
            if fallback != index {
                loadTrack(fallback, autoplay: autoplay)
            }
        }
    }

    private func advanceTrack() {
        guard started else { return }
        let next = (trackIndex + 1) % tracks.count
        loadTrack(next, autoplay: true)
    }

    private func trackURL(_ name: String) -> URL? {
        if let url = Bundle.main.url(forResource: name, withExtension: "m4a", subdirectory: "Music") {
            return url
        }
        return Bundle.main.url(forResource: name, withExtension: "m4a")
    }
}

private final class FinishDelegate: NSObject, AVAudioPlayerDelegate {
    var onFinish: (() -> Void)?

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        onFinish?()
    }
}
