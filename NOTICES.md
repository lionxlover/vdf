# Third-Party Notices

This package includes open-source software developed by third parties.

## Zolto engine — MIT

The Zolto document engine (bundled inside the `vdf` binaries, the browser
extension, the Android app, and optionally inside `.vdf` archives under
`runtime/`) is © Zolto Team, licensed under the MIT license:
https://github.com/uxle/Zolto

```
MIT License

Copyright (c) 2025 Zolto Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Rust crates (compiled into the binaries)

All Rust dependencies are permissively licensed (MIT OR Apache-2.0 or
Unicode-3.0). The full dependency list with licenses:

| Crate | License | Used for |
|---|---|---|
| `zip` | MIT | ZIP container |
| `flate2` (miniz_oxide backend) | MIT OR Apache-2.0 | DEFLATE compression |
| `crc32fast` | MIT OR Apache-2.0 | checksums |
| `serde` / `serde_json` | MIT OR Apache-2.0 | manifest |
| `thiserror` | MIT OR Apache-2.0 | error types |
| `time` | MIT OR Apache-2.0 / Unicode-3.0 | timestamps |
| `toml` | MIT OR Apache-2.0 | project config |
| `clap` / `clap_complete` | MIT OR Apache-2.0 | CLI |
| `colored` | MIT OR Apache-2.0 | terminal colors |
| `jni` | MIT OR Apache-2.0 / Unicode-3.0 | Android bridge |
| `tar` | MIT OR Apache-2.0 / Unicode-3.0 | engine packaging |

## Fonts in the sample document

`sample/assets/fonts/VacerSans-*.woff2` are subsets of the public-domain
DejaVu Sans fonts (Bitstream Vera license / Public Domain), produced with
fontTools (MIT).
