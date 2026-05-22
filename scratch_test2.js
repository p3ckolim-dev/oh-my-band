import abcjs from 'abcjs';

const abcString = `X:1
T:Scale Test
M:4/4
L:1/4
K:G
C, D, E, F, | G, A, B, C | D E F G | A B c d | e f g a | b c' d' e' |`;

const parsed = abcjs.parseOnly(abcString);
const tune = parsed[0];
const lines = tune.lines || [];

// Parse key signature accidentals
let keyAccidentals = {};
if (tune.lines && tune.lines[0] && tune.lines[0].staff && tune.lines[0].staff[0] && tune.lines[0].staff[0].key) {
  const key = tune.lines[0].staff[0].key;
  if (key.accidentals) {
    for (const accObj of key.accidentals) {
      const dName = accObj.note.toUpperCase();
      let offset = 0;
      if (accObj.acc === "sharp") offset = 1;
      else if (accObj.acc === "flat") offset = -1;
      else if (accObj.acc === "dblsharp") offset = 2;
      else if (accObj.acc === "dblflat") offset = -2;
      keyAccidentals[dName] = offset;
    }
  }
}
console.log("Parsed Key Accidentals:", keyAccidentals);

const offsetMap = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B

function getMidiNum(pitch, name, accidental) {
  let k = Math.floor(pitch / 7);
  let r = pitch % 7;
  if (r < 0) {
    r += 7;
  }
  let baseMidi = 60 + k * 12 + offsetMap[r];

  let accidentalOffset = 0;
  let hasAccidental = false;

  if (accidental) {
    hasAccidental = true;
    if (accidental === 'sharp' || accidental === '^') {
      accidentalOffset = 1;
    } else if (accidental === 'flat' || accidental === '_') {
      accidentalOffset = -1;
    } else if (accidental === 'dblsharp' || accidental === '^^') {
      accidentalOffset = 2;
    } else if (accidental === 'dblflat' || accidental === '__') {
      accidentalOffset = -2;
    } else if (accidental === 'natural' || accidental === '=') {
      accidentalOffset = 0;
    }
  }

  if (!hasAccidental) {
    const diatonicName = name.charAt(0).toUpperCase();
    if (keyAccidentals && keyAccidentals[diatonicName] !== undefined) {
      accidentalOffset = keyAccidentals[diatonicName];
    }
  }

  return baseMidi + accidentalOffset;
}

console.log("Analyzing pitches and calculating MIDI numbers:");
for (const line of lines) {
  const staffs = line.staff || line.staffs || [];
  for (const staff of staffs) {
    const voices = staff.voices || [];
    for (const voice of voices) {
      for (const el of voice) {
        if (el.el_type === "note" && el.pitches && el.pitches.length > 0) {
          const p = el.pitches[0];
          const calculatedMidi = getMidiNum(p.pitch, p.name, p.accidental);
          console.log(`Note name=${p.name} | pitch=${p.pitch} | calculatedMidi=${calculatedMidi}`);
        }
      }
    }
  }
}
