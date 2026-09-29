#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
audio_dir="$project_dir/public/assets/audio"
owner_reel="$project_dir/reference/freesound_community-slot-machine-reels-sound-30276.mp3"
owner_coin="$project_dir/reference/freesound_community-coin-upaif-14631.mp3"
owner_music="$project_dir/reference/casino-vip-music-game-casino-music-3-469380.mp3"
old_sprite="$audio_dir/sfx-sprite.mp3"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

cp "$old_sprite" "$work_dir/old-sprite.mp3"

ffmpeg -hide_banner -loglevel error -y \
  -i "$work_dir/old-sprite.mp3" -i "$owner_reel" -i "$owner_coin" \
  -filter_complex \
  "[0:a]atrim=0:0.3,asetpts=PTS-STARTPTS[b];
   [1:a]atrim=2.9:3.05,asetpts=PTS-STARTPTS[rh];
   [1:a]atrim=3.05:5.95,asetpts=PTS-STARTPTS[rm];
   [1:a]atrim=5.95:6.1,asetpts=PTS-STARTPTS[rt];
   [rt][rh]acrossfade=d=0.15:c1=tri:c2=tri[rs];
   [rm][rs]concat=n=2:v=0:a=1,loudnorm=I=-22:TP=-2:LRA=7[r];
   [0:a]atrim=2.9:3.45,asetpts=PTS-STARTPTS[st1];
   [0:a]atrim=3.55:4.1,asetpts=PTS-STARTPTS[st2];
   [0:a]atrim=4.2:4.75,asetpts=PTS-STARTPTS[st3];
   [0:a]atrim=4.85:5.55,asetpts=PTS-STARTPTS[n];
   [0:a]atrim=5.65:7.55,asetpts=PTS-STARTPTS[ws];
   [0:a]atrim=7.65:10.15,asetpts=PTS-STARTPTS[wb];
   [0:a]atrim=10.25:11.85,asetpts=PTS-STARTPTS[p];
   [0:a]atrim=11.95:12.6,asetpts=PTS-STARTPTS[ch];
   [0:a]atrim=12.7:13.25,asetpts=PTS-STARTPTS[wh];
   [2:a]atrim=0:0.9,asetpts=PTS-STARTPTS,loudnorm=I=-20:TP=-2:LRA=5[coin];
   anullsrc=r=48000:cl=stereo:d=0.1[s1];anullsrc=r=48000:cl=stereo:d=0.1[s2];
   anullsrc=r=48000:cl=stereo:d=0.1[s3];anullsrc=r=48000:cl=stereo:d=0.1[s4];
   anullsrc=r=48000:cl=stereo:d=0.1[s5];anullsrc=r=48000:cl=stereo:d=0.1[s6];
   anullsrc=r=48000:cl=stereo:d=0.1[s7];anullsrc=r=48000:cl=stereo:d=0.1[s8];
   anullsrc=r=48000:cl=stereo:d=0.1[s9];anullsrc=r=48000:cl=stereo:d=0.1[s10];
   anullsrc=r=48000:cl=stereo:d=0.1[s11];
   [b][s1][r][s2][st1][s3][st2][s4][st3][s5][n][s6][ws][s7][wb][s8][p][s9][ch][s10][wh][s11][coin]concat=n=23:v=0:a=1,aresample=48000,asplit=2[opus][mp3]" \
  -map "[opus]" -c:a libopus -b:a 80k "$audio_dir/sfx-sprite.webm" \
  -map "[mp3]" -c:a libmp3lame -b:a 112k "$audio_dir/sfx-sprite.mp3"

ffmpeg -hide_banner -loglevel error -y -i "$owner_music" \
  -filter_complex \
  "[0:a]atrim=2:118,asetpts=PTS-STARTPTS[main];
   [0:a]atrim=118:120,asetpts=PTS-STARTPTS[tail];
   [0:a]atrim=0:2,asetpts=PTS-STARTPTS[head];
   [tail][head]acrossfade=d=2:c1=tri:c2=tri[seam];
   [main][seam]concat=n=2:v=0:a=1,loudnorm=I=-25:TP=-3:LRA=8,asplit=2[opus][mp3]" \
  -map "[opus]" -c:a libopus -b:a 64k "$audio_dir/ambient-loop.webm" \
  -map "[mp3]" -c:a libmp3lame -b:a 96k "$audio_dir/ambient-loop.mp3"
