const content = "OK get MIXER:Current/InCh/ToMix/Level 0 0 -1630";
const match = content.match(
  /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToMix\/Level"?\s+(\d+)\s+(\d+)\s+(-?\d+)/
);
console.log("Match result:", match);
if (match) {
  console.log("Input:", match[1]);
  console.log("Mix:", match[2]);
  console.log("Level:", match[3]);
}

const content2 = 'NOTIFY set MIXER:Current/InCh/ToMix/Level 15 5 -32768 "-inf"';
const match2 = content2.match(
  /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToMix\/Level"?\s+(\d+)\s+(\d+)\s+(-?\d+)/
);
console.log("Match result 2:", match2);

const contentError = 'OK get MIXER:Current/InCh/ToMix/Level 0 0 "-1630"'; // Hypothetical quoting
const matchError = contentError.match(
  /(?:get|set)?\s*"?MIXER:Current\/InCh\/ToMix\/Level"?\s+(\d+)\s+(\d+)\s+(-?\d+)/
);
console.log("Match result Error:", matchError);
