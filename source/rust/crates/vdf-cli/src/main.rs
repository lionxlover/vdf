//! `vdf` — command-line tool for the VDF (Vacter Document File) format.

mod commands;
mod project;

use clap::{CommandFactory, Parser, Subcommand};
use clap_complete::{generate, Shell};

#[derive(Parser)]
#[command(
    name = "vdf",
    version,
    about = "VDF — Vacter Document File: a PDF-like container for Zolto documents",
    long_about = "VDF (Vacter Document File) packages a Zolto .zl document with its assets \
(images, SVG, fonts) into one super-compressed, PDF-flavoured archive that any \
browser can render.\n\nA .vdf is simultaneously a first-class document (magic header, \
manifest, CRC trailer) and a standard ZIP archive (openable by unzip/7-Zip)."
)]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Scaffold a new VDF project
    #[command(alias = "new")]
    Init {
        /// Project directory (default: current dir)
        path: Option<std::path::PathBuf>,
        #[arg(long)]
        title: Option<String>,
        #[arg(long)]
        author: Option<String>,
        /// Entry document name (default: document.zl)
        #[arg(long)]
        entry: Option<String>,
    },

    /// Pack a project directory into a .vdf archive
    #[command(alias = "pack", alias = "create")]
    Build {
        /// Project directory (default: current dir)
        path: Option<std::path::PathBuf>,
        /// Output .vdf path (default: <dir>.vdf)
        #[arg(short, long)]
        output: Option<std::path::PathBuf>,
        /// Embed the Zolto runtime into the archive
        #[arg(long)]
        runtime: bool,
        /// Do not embed a runtime (default)
        #[arg(long, conflicts_with = "runtime")]
        no_runtime: bool,
        #[arg(long)]
        title: Option<String>,
        #[arg(long)]
        author: Option<String>,
    },

    /// Unpack a .vdf archive
    #[command(alias = "unpack")]
    Extract {
        file: std::path::PathBuf,
        /// Output directory (default: <file> directory + .extracted)
        #[arg(short, long)]
        output: Option<std::path::PathBuf>,
    },

    /// Table of contents of a .vdf
    #[command(alias = "ls", alias = "toc")]
    List {
        file: std::path::PathBuf,
        #[arg(long)]
        json: bool,
    },

    /// Manifest, trailer and size details
    #[command(alias = "meta")]
    Info {
        file: std::path::PathBuf,
        #[arg(long)]
        json: bool,
    },

    /// Run the structural check suite (exit 1 on failure)
    #[command(alias = "check")]
    Validate {
        file: std::path::PathBuf,
        #[arg(long)]
        json: bool,
    },

    /// Render a .vdf as an offline-viewable HTML page
    #[command(alias = "render", alias = "preview")]
    View {
        file: std::path::PathBuf,
        /// Extract viewer into this directory
        #[arg(short, long)]
        output: Option<std::path::PathBuf>,
        /// Produce ONE portable .html (engine + assets inlined)
        #[arg(short = 's', long)]
        single: Option<std::path::PathBuf>,
        /// Do not try to open a browser
        #[arg(long)]
        no_open: bool,
    },

    /// Generate shell completions
    Completions { shell: Shell },

    /// Print the VDF 1.0 format specification
    #[command(alias = "spec")]
    Doc,
}

fn main() {
    // Restore the default SIGPIPE disposition so `vdf list | head` exits
    // quietly like any Unix tool instead of panicking on a broken pipe.
    #[cfg(unix)]
    unsafe {
        #[link(name = "c")]
        extern "C" {
            fn signal(signum: i32, handler: usize) -> usize;
        }
        const SIGPIPE: i32 = 13;
        const SIG_DFL: usize = 0;
        signal(SIGPIPE, SIG_DFL);
    }

    let cli = Cli::parse();
    let code = match cli.cmd {
        Cmd::Init { path, title, author, entry } => commands::init(path, title, author, entry),
        Cmd::Build { path, output, runtime, no_runtime, title, author } => {
            let _ = no_runtime; // exists for clap conflict validation only
            commands::build(path, output, runtime, title, author)
        }
        Cmd::Extract { file, output } => commands::extract(file, output),
        Cmd::List { file, json } => commands::list(file, json),
        Cmd::Info { file, json } => commands::info(file, json),
        Cmd::Validate { file, json } => commands::validate(file, json),
        Cmd::View { file, output, single, no_open } => commands::view(file, output, single, no_open),
        Cmd::Completions { shell } => {
            let mut cmd = Cli::command();
            let bin = "vdf".to_string();
            generate(shell, &mut cmd, bin, &mut std::io::stdout());
            0
        }
        Cmd::Doc => {
            print!("{}", vdf_core::spec::SPEC);
            0
        }
    };
    std::process::exit(code);
}
