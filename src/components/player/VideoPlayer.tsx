// Premium custom HTML5 Video Player with Netflix styling, custom controls, keyboard shortcuts, skip intro, and episode drawer.
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tv,
  Info,
  SkipForward,
  PlayCircle,
  Subtitles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/button";

interface VideoPlayerProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  title: string;
  backdropPath?: string | null;
  season?: number;
  episode?: number;
  episodesCount?: number;
}

export default function VideoPlayer({
  mediaId,
  mediaType,
  title,
  backdropPath,
  season = 1,
  episode = 1,
  episodesCount = 10,
}: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
  const [subtitleLanguage, setSubtitleLanguage] = useState("Off");

  // Skip Intro tracking
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  
  // Episode Drawer
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState(episode);

  // Server-choice state: "cinema" | "vidsrc_to" | "vidsrc_xyz" | "embed_su"
  const [activeServer, setActiveServer] = useState<"cinema" | "vidsrc_to" | "vidsrc_xyz" | "embed_su">("cinema");

  // Unified Settings Drawer tabbed states
  const [settingsTab, setSettingsTab] = useState<"main" | "server" | "quality" | "speed" | "audio">("main");
  const [videoQuality, setVideoQuality] = useState("Auto (1080p)");
  const [audioTrack, setAudioTrack] = useState("Dolby Digital 5.1");

  // Demo direct video source (using stable Sintel MP4 stream)
  const videoSrc = "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4";

  // Auto Hide Controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      if (isPlaying) {
        timeout = setTimeout(() => setShowControls(false), 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", resetTimer);
      container.addEventListener("keypress", resetTimer);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", resetTimer);
        container.removeEventListener("keypress", resetTimer);
      }
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if input is focused
      if (document.activeElement?.tagName === "INPUT") return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.05));
          break;
        case "KeyF":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Sync Video properties
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = isMuted ? 0 : volume;
      video.playbackRate = playbackSpeed;
    }
  }, [volume, isMuted, playbackSpeed]);

  // Time progress logging (saves progress to DB)
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video) return;
      
      try {
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaId,
            mediaType,
            title,
            backdropPath,
            progress: video.currentTime,
            duration: video.duration || 1,
            season: mediaType === "tv" ? season : null,
            episode: mediaType === "tv" ? currentEpisode : null,
          }),
        });
      } catch (err) {
        console.error("Failed to save progress", err);
      }
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [isPlaying, mediaId, mediaType, title, backdropPath, season, currentEpisode]);

  // Skip Intro show / hide logic
  useEffect(() => {
    // Show "Skip Intro" between 10s and 30s
    if (currentTime >= 10 && currentTime <= 30) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }
  }, [currentTime]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const time = parseFloat(e.target.value);
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleSkipIntro = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 90; // Skip to 1m 30s
      setShowSkipIntro(false);
    }
  };

  const selectEpisode = (epNum: number) => {
    setCurrentEpisode(epNum);
    setShowEpisodeDrawer(false);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen bg-black overflow-hidden select-none"
    >
      {/* Top Back Controls (visible on hover/pause) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 inset-x-0 z-30 p-6 bg-gradient-to-b from-black/90 to-transparent flex items-center justify-between text-white"
          >
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-zinc-300 hover:text-white transition-colors cursor-pointer focus:outline-none"
            >
              <ChevronLeft className="h-7 w-7" />
              <span className="text-sm font-bold tracking-wider">EXIT</span>
            </button>

            <div className="text-center">
              <h2 className="text-lg md:text-xl font-bold tracking-tight">
                {title}
              </h2>
              {mediaType === "tv" && (
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  S{season} : E{currentEpisode}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stream Area */}
      {activeServer !== "cinema" ? (
        // Iframe Stream
        <div className="w-full h-full">
          <iframe
            src={
              activeServer === "vidsrc_to"
                ? mediaType === "movie"
                  ? `https://vidsrc.to/embed/movie/${mediaId}`
                  : `https://vidsrc.to/embed/tv/${mediaId}/${season}/${currentEpisode}`
                : activeServer === "vidsrc_xyz"
                ? mediaType === "movie"
                  ? `https://vidsrc.xyz/embed/movie/${mediaId}`
                  : `https://vidsrc.xyz/embed/tv/${mediaId}/${season}/${currentEpisode}`
                : mediaType === "movie"
                ? `https://embed.su/embed/movie/${mediaId}`
                : `https://embed.su/embed/tv/${mediaId}/${season}/${currentEpisode}`
            }
            title="Premium Streaming Player"
            className="w-full h-full border-none"
            allowFullScreen
          />
        </div>
      ) : (
        // Direct HTML5 Player
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
            autoPlay
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Large Center Play State Button (fades on pause) */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={togglePlay}
                className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto cursor-pointer"
              >
                <div className="p-6 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-rose-600 transition-colors shadow-2xl">
                  <PlayCircle className="h-16 w-16 fill-current" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip Intro Trigger */}
          <AnimatePresence>
            {showSkipIntro && (
              <motion.button
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                onClick={handleSkipIntro}
                className="absolute bottom-28 right-8 z-30 px-6 py-3 rounded-lg bg-zinc-950/80 border border-zinc-700 hover:border-white text-white font-bold text-sm backdrop-blur-md flex items-center space-x-2 cursor-pointer shadow-lg"
              >
                <SkipForward className="h-4.5 w-4.5" />
                <span>Skip Intro</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Bottom Custom Controller Deck */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 inset-x-0 z-30 p-6 bg-gradient-to-t from-black/95 to-transparent flex flex-col space-y-4"
              >
                {/* Timeline slider progress */}
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-zinc-300 font-bold">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-600 focus:outline-none"
                  />
                  <span className="text-xs text-zinc-300 font-bold">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Primary Panel Controllers */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-6">
                    {/* Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer focus:outline-none"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6 fill-current" />
                      ) : (
                        <Play className="h-6 w-6 fill-current" />
                      )}
                    </button>

                    {/* Rewind 10s */}
                    <button
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10);
                      }}
                      className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer focus:outline-none"
                    >
                      <RotateCcw className="h-6 w-6" />
                    </button>

                    {/* Volume and Mute slider */}
                    <div className="flex items-center space-x-2 group">
                      <button
                        onClick={toggleMute}
                        className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer focus:outline-none"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-6 w-6" />
                        ) : (
                          <Volume2 className="h-6 w-6" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          setIsMuted(false);
                        }}
                        className="w-0 group-hover:w-20 transition-all duration-300 h-1 bg-zinc-700 appearance-none rounded-lg cursor-pointer accent-rose-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 relative">
                    {/* TV Show Episode Drawer Open */}
                    {mediaType === "tv" && (
                      <button
                        onClick={() => setShowEpisodeDrawer(true)}
                        className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer focus:outline-none flex items-center space-x-1.5"
                        title="Seasons & Episodes"
                      >
                        <Tv className="h-6 w-6" />
                        <span className="text-xs font-bold hidden sm:inline">Episodes</span>
                      </button>
                    )}

                    {/* Subtitle menu dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowSubtitlesMenu(!showSubtitlesMenu);
                          setShowSpeedMenu(false);
                        }}
                        className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer focus:outline-none"
                        title="Subtitles"
                      >
                        <Subtitles className="h-6 w-6" />
                      </button>

                      <AnimatePresence>
                        {showSubtitlesMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute bottom-10 right-0 w-36 rounded-lg bg-zinc-950/95 border border-zinc-800 p-1 flex flex-col text-sm text-zinc-300 z-50 shadow-2xl"
                          >
                            {["Off", "English", "Spanish", "French"].map((lang) => (
                              <button
                                key={lang}
                                onClick={() => {
                                  setSubtitleLanguage(lang);
                                  setShowSubtitlesMenu(false);
                                }}
                                className={`px-3 py-1.5 text-left rounded hover:bg-zinc-800 transition-colors ${
                                  subtitleLanguage === lang ? "text-rose-500 font-bold" : ""
                                }`}
                              >
                                {lang}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Unified Settings popover menu (Tabbed, spacious, customizable) */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setShowSpeedMenu(!showSpeedMenu);
                          setSettingsTab("main");
                          setShowSubtitlesMenu(false);
                        }}
                        className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer focus:outline-none"
                        title="Streaming Settings"
                      >
                        <Settings className="h-6 w-6" />
                      </button>

                      <AnimatePresence>
                        {showSpeedMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute bottom-10 right-0 w-72 rounded-xl bg-zinc-950/95 border border-zinc-800 p-4 flex flex-col text-sm text-zinc-200 z-50 shadow-2xl space-y-3.5"
                          >
                            {settingsTab === "main" && (
                              <div className="flex flex-col space-y-1">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Settings</h4>
                                
                                {/* 1. Server Row */}
                                <button
                                  onClick={() => setSettingsTab("server")}
                                  className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-zinc-900 transition-colors text-left text-xs"
                                >
                                  <span className="font-semibold text-zinc-300">Server</span>
                                  <div className="flex items-center space-x-1.5 text-rose-500 font-bold">
                                    <span>
                                      {activeServer === "cinema" ? "Cinema (Direct)" : activeServer === "vidsrc_to" ? "VidSrc TO" : activeServer === "vidsrc_xyz" ? "VidSrc XYZ" : "Embed SU"}
                                    </span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </div>
                                </button>

                                {/* 2. Quality Row */}
                                <button
                                  onClick={() => setSettingsTab("quality")}
                                  className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-zinc-900 transition-colors text-left text-xs"
                                >
                                  <span className="font-semibold text-zinc-300">Quality</span>
                                  <div className="flex items-center space-x-1.5 text-rose-500 font-bold">
                                    <span>{videoQuality}</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </div>
                                </button>

                                {/* 3. Speed Row (Direct only) */}
                                {activeServer === "cinema" && (
                                  <button
                                    onClick={() => setSettingsTab("speed")}
                                    className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-zinc-900 transition-colors text-left text-xs"
                                  >
                                    <span className="font-semibold text-zinc-300">Speed</span>
                                    <div className="flex items-center space-x-1.5 text-rose-500 font-bold">
                                      <span>{playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}</span>
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </div>
                                  </button>
                                )}

                                {/* 4. Audio Track Row */}
                                <button
                                  onClick={() => setSettingsTab("audio")}
                                  className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-zinc-900 transition-colors text-left text-xs"
                                >
                                  <span className="font-semibold text-zinc-300">Audio Track</span>
                                  <div className="flex items-center space-x-1.5 text-rose-500 font-bold">
                                    <span>{audioTrack}</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </div>
                                </button>
                              </div>
                            )}

                            {settingsTab === "server" && (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => setSettingsTab("main")}
                                  className="flex items-center space-x-1.5 text-xs text-rose-500 font-bold pb-2 border-b border-zinc-900 text-left w-full hover:text-rose-400"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                  <span>Back</span>
                                </button>
                                <div className="flex flex-col space-y-1 mt-1">
                                  {[
                                    { id: "cinema", name: "Cinema Stream (Direct)" },
                                    { id: "vidsrc_to", name: "Server 1 (VidSrc TO)" },
                                    { id: "vidsrc_xyz", name: "Server 2 (VidSrc XYZ)" },
                                    { id: "embed_su", name: "Server 3 (Embed SU)" },
                                  ].map((srv) => (
                                    <button
                                      key={srv.id}
                                      onClick={() => {
                                        setActiveServer(srv.id as any);
                                        setIsPlaying(false);
                                        setSettingsTab("main");
                                      }}
                                      className={`w-full px-3 py-2 text-xs text-left rounded-lg hover:bg-zinc-900 transition-colors ${
                                        activeServer === srv.id ? "text-rose-500 font-bold bg-rose-600/10" : "text-zinc-300"
                                      }`}
                                    >
                                      {srv.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {settingsTab === "quality" && (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => setSettingsTab("main")}
                                  className="flex items-center space-x-1.5 text-xs text-rose-500 font-bold pb-2 border-b border-zinc-900 text-left w-full hover:text-rose-400"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                  <span>Back</span>
                                </button>
                                <div className="flex flex-col space-y-1 mt-1">
                                  {["Auto (1080p)", "1080p (FHD)", "720p (HD)", "480p (SD)"].map((q) => (
                                    <button
                                      key={q}
                                      onClick={() => {
                                        setVideoQuality(q);
                                        setSettingsTab("main");
                                      }}
                                      className={`w-full px-3 py-2 text-xs text-left rounded-lg hover:bg-zinc-900 transition-colors ${
                                        videoQuality === q ? "text-rose-500 font-bold bg-rose-600/10" : "text-zinc-300"
                                      }`}
                                    >
                                      {q}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {settingsTab === "speed" && (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => setSettingsTab("main")}
                                  className="flex items-center space-x-1.5 text-xs text-rose-500 font-bold pb-2 border-b border-zinc-900 text-left w-full hover:text-rose-400"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                  <span>Back</span>
                                </button>
                                <div className="flex flex-col space-y-1 mt-1">
                                  {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                                    <button
                                      key={speed}
                                      onClick={() => {
                                        setPlaybackSpeed(speed);
                                        setSettingsTab("main");
                                      }}
                                      className={`w-full px-3 py-2 text-xs text-left rounded-lg hover:bg-zinc-900 transition-colors ${
                                        playbackSpeed === speed ? "text-rose-500 font-bold bg-rose-600/10" : "text-zinc-300"
                                      }`}
                                    >
                                      {speed === 1 ? "Normal (1x)" : `${speed}x`}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {settingsTab === "audio" && (
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => setSettingsTab("main")}
                                  className="flex items-center space-x-1.5 text-xs text-rose-500 font-bold pb-2 border-b border-zinc-900 text-left w-full hover:text-rose-400"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                  <span>Back</span>
                                </button>
                                <div className="flex flex-col space-y-1 mt-1">
                                  {["Dolby Digital 5.1", "Stereo (2.0)", "Dolby Atmos 7.1"].map((aud) => (
                                    <button
                                      key={aud}
                                      onClick={() => {
                                        setAudioTrack(aud);
                                        setSettingsTab("main");
                                      }}
                                      className={`w-full px-3 py-2 text-xs text-left rounded-lg hover:bg-zinc-900 transition-colors ${
                                        audioTrack === aud ? "text-rose-500 font-bold bg-rose-600/10" : "text-zinc-300"
                                      }`}
                                    >
                                      {aud}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Fullscreen Minimize/Maximize */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer focus:outline-none"
                    >
                      {isFullscreen ? (
                        <Minimize className="h-6 w-6" />
                      ) : (
                        <Maximize className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Episode Navigation Drawer */}
      <AnimatePresence>
        {showEpisodeDrawer && mediaType === "tv" && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEpisodeDrawer(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-80 md:w-96 h-full bg-zinc-950 border-l border-zinc-850 p-6 flex flex-col text-left shadow-2xl z-10"
            >
              <button
                onClick={() => setShowEpisodeDrawer(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                <ChevronLeft className="h-6 w-6 rotate-180" />
              </button>

              <h3 className="text-xl font-black text-white mt-4 mb-2">
                Episodes
              </h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-6">
                Season {season}
              </p>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-2">
                {Array.from({ length: episodesCount }).map((_, i) => {
                  const epNum = i + 1;
                  return (
                    <div
                      key={epNum}
                      onClick={() => selectEpisode(epNum)}
                      className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        currentEpisode === epNum
                          ? "bg-rose-600/10 border-rose-600/50 text-white"
                          : "bg-zinc-900/40 border-zinc-850 hover:bg-zinc-800/80 text-zinc-300"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-bold">
                          Episode {epNum}
                        </p>
                        <p className="text-xs text-zinc-400 line-clamp-1">
                          Cinema stream preview episode {epNum}
                        </p>
                      </div>
                      <Play className="h-4 w-4 fill-current opacity-70" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
