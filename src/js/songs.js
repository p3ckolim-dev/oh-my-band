export const PRESET_SONGS = [
  {
    id: "twinkle",
    title: "반짝반짝 작은 별",
    composer: "프랑스 민요",
    difficulty: "easy",
    tempo: 80,
    abc: `X:1
T:Twinkle Twinkle Little Star
C:Traditional
M:4/4
L:1/4
Q:1/4=80
K:C
C C G G | A A G2 | F F E E | D D C2 |
G G F F | E E D2 | G G F F | E E D2 |
C C G G | A A G2 | F F E E | D D C2 |]`
  },
  {
    id: "ode_to_joy",
    title: "환희의 송가 (Ode to Joy)",
    composer: "L. v. Beethoven",
    difficulty: "medium",
    tempo: 100,
    abc: `X:2
T:Ode to Joy
C:L. v. Beethoven
M:4/4
L:1/4
Q:1/4=100
K:C
E E F G | G F E D | C C D E | E3/2D/2 D2 |
E E F G | G F E D | C C D E | D3/2C/2 C2 |
D D E C | D E/2F/2 E C | D E/2F/2 E D | C D G,2 |
E E F G | G F E D | C C D E | D3/2C/2 C2 |]`
  },
  {
    id: "butterfly",
    title: "나비야 (Butterfly)",
    composer: "독일 민요",
    difficulty: "easy",
    tempo: 90,
    abc: `X:3
T:Butterfly
C:Traditional
M:4/4
L:1/4
Q:1/4=90
K:C
G E E2 | F D D2 | C D E F | G G G2 |
G E E2 | F D D2 | C E G G | E E E2 |
D D D D | D E F2 | E E E E | E F G2 |
G E E2 | F D D2 | C E G G | C C C2 |]`
  },
  {
    id: "spring_breeze",
    title: "봄바람 (Spring Breeze)",
    composer: "W. A. Mozart",
    difficulty: "hard",
    tempo: 96,
    abc: `X:4
T:Spring Breeze
C:W. A. Mozart
M:4/4
L:1/4
Q:1/4=96
K:C
E G G E | F A A2 | G C D E | D2 C2 |
E G G E | F A A2 | G C D E | D2 C2 |
D D E D | E F G2 | A G E C | D2 D2 |
E G G E | F A A2 | G C D E | D2 C2 |`
  }
];

// Helper to clean and validate custom ABC input
export function validateAndFormatABC(title, abcText) {
  if (!abcText.trim()) return null;
  
  // If it doesn't look like valid ABC (missing header tags), prep them
  let formatted = "";
  if (!abcText.includes("X:") && !abcText.includes("T:")) {
    formatted = `X:99\nT:${title}\nM:4/4\nL:1/4\nQ:1/4=80\nK:C\n${abcText}`;
  } else {
    formatted = abcText;
  }
  return formatted;
}
