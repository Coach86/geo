export function srtToVtt(srtContent: string): string {
  // Replace commas with dots in timestamps
  const vttContent = srtContent
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .trim();
  
  // Add WEBVTT header
  return `WEBVTT\n\n${vttContent}`;
}

export function convertSrtFile(srtPath: string): string {
  // This function would be used server-side to convert SRT files
  // For now, we'll just document the expected format
  return `
WEBVTT

1
00:00:00.000 --> 00:00:03.072
Hello everyone, this is Mathieu from Mint.

2
00:00:03.388 --> 00:00:08.021
Welcome to our beta. While your first project analysis is

3
00:00:08.022 --> 00:00:11.248
being run, and will be displayed in a few minutes,
`;
}