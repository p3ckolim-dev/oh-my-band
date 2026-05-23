// Preset Drum Songs Library for Oh My Band
// Format is beat-based JSON.
// Types: "kick", "snare", "hihat", "tom", "crash"

export const DRUM_SONGS = [
  {
    id: "drum_basic_8beat",
    title: "기본 8비트 락 (Basic 8-Beat Rock)",
    composer: "Oh My Band",
    difficulty: "easy",
    tempo: 90,
    maxBeat: 16.5, // The song finishes after beat 16
    notes: [
      // Bar 1
      { beat: 1.0, type: "kick" }, { beat: 1.0, type: "hihat" },
      { beat: 1.5, type: "hihat" },
      { beat: 2.0, type: "snare" }, { beat: 2.0, type: "hihat" },
      { beat: 2.5, type: "hihat" },
      { beat: 3.0, type: "kick" }, { beat: 3.0, type: "hihat" },
      { beat: 3.5, type: "hihat" },
      { beat: 4.0, type: "snare" }, { beat: 4.0, type: "hihat" },
      { beat: 4.5, type: "hihat" },
      // Bar 2
      { beat: 5.0, type: "kick" }, { beat: 5.0, type: "hihat" },
      { beat: 5.5, type: "hihat" },
      { beat: 6.0, type: "snare" }, { beat: 6.0, type: "hihat" },
      { beat: 6.5, type: "hihat" },
      { beat: 7.0, type: "kick" }, { beat: 7.0, type: "hihat" },
      { beat: 7.5, type: "hihat" },
      { beat: 8.0, type: "snare" }, { beat: 8.0, type: "hihat" },
      { beat: 8.5, type: "hihat" },
      // Bar 3
      { beat: 9.0, type: "kick" }, { beat: 9.0, type: "hihat" },
      { beat: 9.5, type: "hihat" },
      { beat: 10.0, type: "snare" }, { beat: 10.0, type: "hihat" },
      { beat: 10.5, type: "hihat" },
      { beat: 11.0, type: "kick" }, { beat: 11.0, type: "hihat" },
      { beat: 11.5, type: "hihat" },
      { beat: 12.0, type: "snare" }, { beat: 12.0, type: "hihat" },
      { beat: 12.5, type: "hihat" },
      // Bar 4 (Simple Fill-in before ending)
      { beat: 13.0, type: "kick" }, { beat: 13.0, type: "hihat" },
      { beat: 13.5, type: "hihat" },
      { beat: 14.0, type: "snare" }, { beat: 14.5, type: "snare" },
      { beat: 15.0, type: "tom" }, { beat: 15.5, type: "tom" },
      { beat: 16.0, type: "crash" }, { beat: 16.0, type: "kick" }
    ]
  },
  {
    id: "drum_disco",
    title: "신나는 디스코 댄스 (Disco Dance)",
    composer: "Oh My Band",
    difficulty: "medium",
    tempo: 120,
    maxBeat: 16.5,
    notes: [
      // Four on the Floor kick, off-beat hi-hat, snare on 2 and 4
      // Bar 1
      { beat: 1.0, type: "kick" }, { beat: 1.0, type: "hihat" },
      { beat: 1.5, type: "hihat" },
      { beat: 2.0, type: "kick" }, { beat: 2.0, type: "snare" },
      { beat: 2.5, type: "hihat" },
      { beat: 3.0, type: "kick" }, { beat: 3.0, type: "hihat" },
      { beat: 3.5, type: "hihat" },
      { beat: 4.0, type: "kick" }, { beat: 4.0, type: "snare" },
      { beat: 4.5, type: "hihat" },
      // Bar 2
      { beat: 5.0, type: "kick" }, { beat: 5.0, type: "hihat" },
      { beat: 5.5, type: "hihat" },
      { beat: 6.0, type: "kick" }, { beat: 6.0, type: "snare" },
      { beat: 6.5, type: "hihat" },
      { beat: 7.0, type: "kick" }, { beat: 7.0, type: "hihat" },
      { beat: 7.5, type: "hihat" },
      { beat: 8.0, type: "kick" }, { beat: 8.0, type: "snare" },
      { beat: 8.5, type: "hihat" },
      // Bar 3
      { beat: 9.0, type: "kick" }, { beat: 9.0, type: "hihat" },
      { beat: 9.5, type: "hihat" },
      { beat: 10.0, type: "kick" }, { beat: 10.0, type: "snare" },
      { beat: 10.5, type: "hihat" },
      { beat: 11.0, type: "kick" }, { beat: 11.0, type: "hihat" },
      { beat: 11.5, type: "hihat" },
      { beat: 12.0, type: "kick" }, { beat: 12.0, type: "snare" },
      { beat: 12.5, type: "hihat" },
      // Bar 4 (Disco Fill)
      { beat: 13.0, type: "kick" }, { beat: 13.0, type: "hihat" },
      { beat: 13.5, type: "hihat" },
      { beat: 14.0, type: "snare" }, { beat: 14.25, type: "snare" }, { beat: 14.5, type: "snare" }, { beat: 14.75, type: "snare" },
      { beat: 15.0, type: "tom" }, { beat: 15.25, type: "tom" }, { beat: 15.5, type: "tom" }, { beat: 15.75, type: "tom" },
      { beat: 16.0, type: "crash" }, { beat: 16.0, type: "kick" }
    ]
  },
  {
    id: "drum_shuffle",
    title: "그루비 블루스 셔플 (Blues Shuffle)",
    composer: "Oh My Band",
    difficulty: "hard",
    tempo: 96,
    maxBeat: 16.5,
    notes: [
      // Triplet feel hi-hat (swing/shuffle)
      // Triplet beats: 1.0, 1.66, 2.0, 2.66...
      // Bar 1
      { beat: 1.0, type: "kick" }, { beat: 1.0, type: "hihat" },
      { beat: 1.66, type: "hihat" },
      { beat: 2.0, type: "snare" }, { beat: 2.0, type: "hihat" },
      { beat: 2.66, type: "hihat" },
      { beat: 3.0, type: "kick" }, { beat: 3.0, type: "hihat" },
      { beat: 3.66, type: "hihat" },
      { beat: 4.0, type: "snare" }, { beat: 4.0, type: "hihat" },
      { beat: 4.66, type: "hihat" },
      // Bar 2
      { beat: 5.0, type: "kick" }, { beat: 5.0, type: "hihat" },
      { beat: 5.5, type: "kick" }, { beat: 5.66, type: "hihat" },
      { beat: 6.0, type: "snare" }, { beat: 6.0, type: "hihat" },
      { beat: 6.66, type: "hihat" },
      { beat: 7.0, type: "kick" }, { beat: 7.0, type: "hihat" },
      { beat: 7.66, type: "hihat" },
      { beat: 8.0, type: "snare" }, { beat: 8.0, type: "hihat" },
      { beat: 8.66, type: "hihat" },
      // Bar 3
      { beat: 9.0, type: "kick" }, { beat: 9.0, type: "hihat" },
      { beat: 9.66, type: "hihat" },
      { beat: 10.0, type: "snare" }, { beat: 10.0, type: "hihat" },
      { beat: 10.66, type: "hihat" },
      { beat: 11.0, type: "kick" }, { beat: 11.0, type: "hihat" },
      { beat: 11.66, type: "hihat" },
      { beat: 12.0, type: "snare" }, { beat: 12.0, type: "hihat" },
      { beat: 12.66, type: "hihat" },
      // Bar 4 (Shuffle Fill)
      { beat: 13.0, type: "kick" }, { beat: 13.0, type: "hihat" },
      { beat: 13.66, type: "hihat" },
      { beat: 14.0, type: "snare" }, { beat: 14.33, type: "snare" }, { beat: 14.66, type: "snare" },
      { beat: 15.0, type: "tom" }, { beat: 15.33, type: "tom" }, { beat: 15.66, type: "tom" },
      { beat: 16.0, type: "crash" }, { beat: 16.0, type: "kick" }
    ]
  }
];
