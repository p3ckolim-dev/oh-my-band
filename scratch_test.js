import abcjs from 'abcjs';

const abcString = `X:1
T:Twinkle Twinkle Little Star
C:Traditional
M:4/4
L:1/4
Q:1/4=80
K:G
C C G G | A A G2 | F F E E | D D C2 |`;

// Use parseOnly if available
if (abcjs.parseOnly) {
  const parsed = abcjs.parseOnly(abcString);
  console.log("parsed structure:", JSON.stringify(parsed, null, 2));
} else {
  console.log("parseOnly is not available, mocking document and window...");
  globalThis.document = {
    getElementById: () => ({ appendChild: () => {}, innerHTML: "" }),
    createElement: () => ({ style: {}, appendChild: () => {} }),
    createElementNS: () => ({ style: {}, setAttribute: () => {}, setAttributeNS: () => {} }),
  };
  globalThis.window = {
    addEventListener: () => {},
  };
  const visualObj = abcjs.renderAbc("paper", abcString);
  console.log("visualObj structure:", JSON.stringify(visualObj, null, 2));
}
