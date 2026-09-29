#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
faces_dir="$project_dir/public/assets/faces"
source_dir="$project_dir/reference/_work/generated/round1-faces/rejected"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
mkdir -p "$source_dir"

for person in scott fiona gia keith; do
  for frame in idle half closed win; do
    name="$person-$frame.webp"
    if [[ ! -f "$source_dir/$name" ]]; then cp "$faces_dir/$name" "$source_dir/$name"; fi
    mask="$work_dir/$person-$frame-mask.png"
    base="$work_dir/$person-$frame-base.png"
    inner="$work_dir/$person-$frame-inner.png"
    magick -size 512x512 xc:black -fill white -draw 'circle 256,256 256,46' "$mask"
    magick -size 512x512 xc:none -fill '#690a18' -draw 'circle 256,256 256,24' "$base"
    magick "$source_dir/$name" "$mask" -alpha off -compose CopyOpacity -composite "$inner"
  magick "$base" "$inner" -compose Over -composite \
    -fill none -stroke '#d8aa3e' -strokewidth 10 -draw 'circle 256,256 256,27' \
    -quality 82 -define webp:alpha-quality=95 "$faces_dir/$name"
  done
done
