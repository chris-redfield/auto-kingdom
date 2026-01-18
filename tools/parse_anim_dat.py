#!/usr/bin/env python3
"""
Parse animation .dat files from Majesty game.
Based on reverse engineering of Animation.smali

Format:
- For package 0 only: 1 byte numPackages
- 2 bytes (big-endian short): numAnimations
- For each animation:
  - 1 byte: numFrames
  - For each frame:
    - 1 byte: delay
    - 1 byte: numLayers
    - For each layer:
      - 8 bytes: rect data (4 little-endian shorts: x, y, w, h)
      - 4 bytes: packed layer data (big-endian int)
"""

import struct
import sys
import json

def parse_dat(filepath, package_id=0):
    with open(filepath, 'rb') as f:
        data = f.read()

    offset = 0
    result = {
        'package_id': package_id,
        'animations': []
    }

    # First package contains num packages
    if package_id == 0:
        num_packages = data[offset]
        offset += 1
        result['num_packages'] = num_packages
        print(f"Num packages: {num_packages}")

    # Number of animations (big-endian short)
    num_animations = struct.unpack('>H', data[offset:offset+2])[0]
    offset += 2
    result['num_animations'] = num_animations
    print(f"Num animations: {num_animations}")

    max_sprite_idx = 0

    for anim_id in range(num_animations):
        anim = {
            'id': anim_id,
            'frames': []
        }

        num_frames = data[offset]
        offset += 1

        for frame_id in range(num_frames):
            frame = {
                'id': frame_id,
                'layers': []
            }

            # Delay (signed byte)
            delay = struct.unpack('b', data[offset:offset+1])[0]
            frame['delay'] = delay
            offset += 1

            # Number of layers
            num_layers = data[offset]
            offset += 1

            for layer_id in range(num_layers):
                # Rect data - big-endian shorts (Java default)
                rect_x = struct.unpack('>H', data[offset:offset+2])[0]
                offset += 2
                rect_y = struct.unpack('>H', data[offset:offset+2])[0]
                offset += 2
                rect_w = struct.unpack('>H', data[offset:offset+2])[0]
                offset += 2
                rect_h = struct.unpack('>H', data[offset:offset+2])[0]
                offset += 2

                # Packed data - big-endian int
                packed = struct.unpack('>I', data[offset:offset+4])[0]
                offset += 4

                # Unpack the data
                sprite_index = (packed >> 23) & 0x1FF
                x_offset = ((packed >> 13) & 0x3FF) - 512
                y_offset = ((packed >> 3) & 0x3FF) - 512
                transform = packed & 0x7

                if sprite_index > max_sprite_idx:
                    max_sprite_idx = sprite_index

                layer = {
                    'rect': {'x': rect_x, 'y': rect_y, 'w': rect_w, 'h': rect_h},
                    'sprite_index': sprite_index,
                    'x_offset': x_offset,
                    'y_offset': y_offset,
                    'transform': transform,
                    'packed_raw': hex(packed)
                }
                frame['layers'].append(layer)

            anim['frames'].append(frame)

        result['animations'].append(anim)

    result['max_sprite_index'] = max_sprite_idx
    print(f"Max sprite index: {max_sprite_idx}")
    print(f"Bytes read: {offset}, File size: {len(data)}")

    return result

def main():
    if len(sys.argv) < 2:
        # Default to anims7.dat for testing
        filepath = '/mnt/c/proj/autokingdom/majesty-js/assets/sprites/anims/anims7.dat'
        package_id = 7
    else:
        filepath = sys.argv[1]
        package_id = int(sys.argv[2]) if len(sys.argv) > 2 else 0

    print(f"Parsing {filepath} (package {package_id})...")
    result = parse_dat(filepath, package_id)

    # Print first few animations
    print(f"\n--- First 3 animations ---")
    for anim in result['animations'][:3]:
        print(f"\nAnimation {anim['id']}: {len(anim['frames'])} frames")
        for frame in anim['frames'][:2]:
            print(f"  Frame {frame['id']}: delay={frame['delay']}, layers={len(frame['layers'])}")
            for layer in frame['layers'][:3]:
                r = layer['rect']
                print(f"    Layer: rect({r['x']},{r['y']},{r['w']},{r['h']}) sprite={layer['sprite_index']} offset=({layer['x_offset']},{layer['y_offset']}) transform={layer['transform']}")

    # Save to JSON
    output_path = filepath.replace('.dat', '_parsed.json')
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\nSaved parsed data to: {output_path}")

if __name__ == '__main__':
    main()
