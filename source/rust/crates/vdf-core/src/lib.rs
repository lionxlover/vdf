//! # vdf-core
//!
//! Core library for the **VDF (Vacter Document File)** format — a PDF-like
//! container for [Zolto](https://github.com/uxle/Zolto) documents.
//!
//! ```no_run
//! use vdf_core::{Manifest, VdfBuilder, VdfDocument};
//!
//! # fn main() -> Result<(), Box<dyn std::error::Error>> {
//! // build
//! let mut m = Manifest::new("document.zl");
//! m.title = "Hello VDF".into();
//! let bytes = VdfBuilder::new(m, b"# Hello VDF\n".to_vec()).build()?;
//! std::fs::write("hello.vdf", bytes)?;
//!
//! // read
//! let mut doc = VdfDocument::open("hello.vdf")?;
//! assert_eq!(doc.read_document()?, b"# Hello VDF\n");
//! # Ok(())
//! # }
//! ```

pub mod engine;
pub mod error;
pub mod format;
pub mod manifest;
pub mod reader;
pub mod spec;
pub mod util;
pub mod validate;
pub mod viewer;
pub mod writer;

pub use error::{Result, VdfError};
pub use manifest::Manifest;
pub use reader::VdfDocument;
pub use writer::VdfBuilder;

/// Tool version (kept in sync with the crate version).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
