package com.vacter.vdfviewer;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.vacter.vdf.Vdf;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * VDF Viewer — opens .vdf (Vacter Document File) documents and renders them
 * offline with the embedded Zolto engine.
 */
public class MainActivity extends Activity {

    private static final int REQ_OPEN = 42;
    private static final String MIMETYPE = "application/vnd.vacter.vdf";

    private WebView web;
    private LinearLayout emptyState;
    private TextView topTitle;
    private LinearLayout root;
    private int extractSeq = 0;

    // ── lifecycle ───────────────────────────────────────────────────────────

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action)) {
            openUri(intent.getData());
        }
    }

    // ── UI ──────────────────────────────────────────────────────────────────

    private void buildUi() {
        int px = Math.round(getResources().getDisplayMetrics().density);

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFFF3F4F7);

        // top bar
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(12 * px, 8 * px, 12 * px, 8 * px);
        bar.setBackgroundColor(0xFFFFFFFF);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(24 * px, 24 * px);
        logo.setLayoutParams(lp);

        topTitle = new TextView(this);
        topTitle.setText("VDF Viewer");
        topTitle.setTextColor(0xFF171A23);
        topTitle.setTextSize(14);
        topTitle.setTypeface(topTitle.getTypeface(), android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        tp.leftMargin = 10 * px;
        topTitle.setLayoutParams(tp);

        Button open = new Button(this, null, 0, android.R.attr.borderlessButtonStyle);
        open.setText("Open…");
        open.setTextColor(0xFF2457FF);
        open.setOnClickListener(v -> pickFile());

        bar.addView(logo);
        bar.addView(topTitle);
        bar.addView(open);
        root.addView(bar, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // web view
        web = makeWebView(px);

        // empty state
        emptyState = buildEmptyState(px);

        root.addView(web, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        root.addView(emptyState, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        showEmptyState();

        setContentView(root);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private WebView makeWebView(int px) {
        WebView w = new WebView(this);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        w.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme() == null ? "" : u.getScheme();
                if (scheme.equals("http") || scheme.equals("https")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, u));
                    } catch (Exception ignored) {}
                    return true;
                }
                return false;
            }
        });
        w.setWebChromeClient(new WebChromeClient());
        w.setBackgroundColor(Color.WHITE);
        return w;
    }

    private LinearLayout buildEmptyState(int px) {
        ScrollView scroll = new ScrollView(this);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setPadding(28 * px, 48 * px, 28 * px, 48 * px);
        scroll.addView(box);

        ImageView big = new ImageView(this);
        big.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(96 * px, 96 * px);
        big.setLayoutParams(bp);
        big.setPadding(0, 0, 0, 16 * px);

        TextView title = new TextView(this);
        title.setText("VDF Viewer");
        title.setTextSize(24);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        title.setTextColor(0xFF171A23);
        title.setGravity(Gravity.CENTER);

        TextView sub = new TextView(this);
        sub.setText("Open a Vacter Document File — a PDF-like archive of a Zolto document with its images, SVGs and fonts. Everything renders offline.");
        sub.setTextSize(14);
        sub.setTextColor(0xFF69707F);
        sub.setGravity(Gravity.CENTER);
        sub.setPadding(8 * px, 8 * px, 8 * px, 24 * px);

        Button open = new Button(this);
        open.setText("Open a .vdf file");
        open.setTextColor(Color.WHITE);
        open.getPaint().setFakeBoldText(true);
        open.setBackgroundColor(0xFF2457FF);
        open.setPadding(24 * px, 12 * px, 24 * px, 12 * px);
        open.setOnClickListener(v -> pickFile());

        Button sample = new Button(this, null, 0, android.R.attr.borderlessButtonStyle);
        sample.setText("Try the bundled sample");
        sample.setTextColor(0xFF2457FF);
        sample.setOnClickListener(v -> openBundledSample());

        box.addView(big);
        box.addView(title);
        box.addView(sub);
        box.addView(open);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        sp.topMargin = 4 * px;
        box.addView(sample, sp);

        LinearLayout wrap = new LinearLayout(this);
        wrap.addView(scroll, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        return wrap;
    }

    private void showEmptyState() {
        web.setVisibility(View.GONE);
        emptyState.setVisibility(View.VISIBLE);
    }

    private void showDoc() {
        emptyState.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
    }

    private void toast(String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_LONG).show());
    }

    // ── file opening ────────────────────────────────────────────────────────

    private void pickFile() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("*/*");
        i.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                MIMETYPE, "application/zip", "application/octet-stream", "*/*"});
        startActivityForResult(i, REQ_OPEN);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_OPEN && resultCode == RESULT_OK && data != null && data.getData() != null) {
            openUri(data.getData());
        }
    }

    private void openBundledSample() {
        try {
            File out = new File(getCacheDir(), "sample.vdf");
            copyAsset("sample.vdf", out);
            openVdfFile(out.getAbsolutePath());
        } catch (Exception e) {
            toast("Sample failed: " + e.getMessage());
        }
    }

    private void openUri(Uri uri) {
        try {
            File tmp = new File(getCacheDir(), "open-" + (++extractSeq) + ".vdf");
            try (InputStream in = getContentResolver().openInputStream(uri);
                 OutputStream out = new FileOutputStream(tmp)) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            openVdfFile(tmp.getAbsolutePath());
        } catch (Exception e) {
            toast("Cannot open: " + e.getMessage());
        }
    }

    private void openVdfFile(String path) {
        new Thread(() -> {
            try {
                String infoJson = Vdf.info(path);
                if (infoJson == null) {
                    toast("Not a valid VDF file (missing %VDF-1.0 header).");
                    return;
                }
                File dir = new File(getCacheDir(), "doc-" + System.currentTimeMillis());
                String[] extracted = Vdf.extract(path, dir.getAbsolutePath());
                if (extracted == null) {
                    toast("Extraction failed.");
                    return;
                }
                render(dir, infoJson);
            } catch (Exception e) {
                toast("Error: " + e.getMessage());
            }
        }, "vdf-open").start();
    }

    // ── rendering ───────────────────────────────────────────────────────────

    private void render(File dir, String infoJson) throws Exception {
        JSONObject info = new JSONObject(infoJson);
        JSONObject manifest = info.getJSONObject("manifest");
        String entry = manifest.optString("entry", "document.zl");
        String title = manifest.optString("title", "");
        if (title.isEmpty()) title = "VDF document";
        final String docTitle = title;

        File docFile = new File(dir, entry);
        if (!docFile.isFile()) throw new Exception("entry document " + entry + " missing");
        String docSrc = new String(Files.readAllBytes(docFile.toPath()), StandardCharsets.UTF_8);

        // engine: prefer a runtime embedded in the archive, else the app copy
        File runtimeBundle = new File(dir, "runtime/zolto.bundle.js");
        if (!runtimeBundle.isFile()) {
            File localEngine = new File(dir, "zolto.bundle.js");
            copyAsset("zolto.bundle.js", localEngine);
        }

        // fonts → @font-face (relative paths work under file://)
        StringBuilder fonts = new StringBuilder();
        List<String> families = new ArrayList<>();
        collectFonts(new File(dir, "assets/fonts"), "assets/fonts", fonts, families);
        String fontStack = "";
        if (!families.isEmpty()) {
            StringBuilder fs = new StringBuilder();
            for (String f : families) fs.append('\'').append(f).append("',");
            fontStack = "main.doc{font-family:" + fs
                    + "ui-sans-serif,system-ui,'Segoe UI',Roboto,Arial,sans-serif}";
        }

        String logoB64 = Base64.encodeToString(LOGO_SVG.getBytes(StandardCharsets.UTF_8),
                Base64.NO_WRAP);
        String favicon = "data:image/svg+xml;base64," + logoB64;

        String html = VIEWER_TEMPLATE
                .replace("__FAVI__", favicon)
                .replace("__TITLE__", escapeHtml(title))
                .replace("__FONTS__", fonts.toString())
                .replace("__FONTSTACK__", fontStack)
                .replace("__ENGINE__", new File(dir, "runtime/zolto.bundle.js").isFile()
                        ? "runtime/zolto.bundle.js" : "zolto.bundle.js")
                .replace("__DOC__", jsonString(docSrc));

        File index = new File(dir, "index.html");
        Files.write(index.toPath(), html.getBytes(StandardCharsets.UTF_8));

        runOnUiThread(() -> {
            topTitle.setText(docTitle);
            web.loadUrl("file://" + index.getAbsolutePath());
            showDoc();
        });
    }

    private void collectFonts(File dir, String rel, StringBuilder css, List<String> families) {
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File f : children) {
            String name = f.getName().toLowerCase(Locale.US);
            if (f.isDirectory()) {
                collectFonts(f, rel + "/" + f.getName(), css, families);
                continue;
            }
            String fmt = null;
            if (name.endsWith(".woff2")) fmt = "woff2";
            else if (name.endsWith(".woff")) fmt = "woff";
            else if (name.endsWith(".ttf")) fmt = "truetype";
            else if (name.endsWith(".otf")) fmt = "opentype";
            if (fmt == null) continue;
            String fam = "VdfFont" + (families.size() + 1);
            String weight = name.contains("bold") ? "bold" : "normal";
            css.append("@font-face{font-family:'").append(fam)
               .append("';src:url('").append(rel).append('/').append(f.getName())
               .append("') format('").append(fmt)
               .append("');font-weight:").append(weight).append(";font-display:swap}\n");
            families.add(fam);
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private void copyAsset(String asset, File out) throws Exception {
        try (InputStream in = getAssets().open(asset);
             OutputStream os = new FileOutputStream(out)) {
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
        }
    }

    /** HTML-escape a string. */
    static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;");
    }

    /** Encode a Java string as a JSON string literal (for embedding in JS). */
    static String jsonString(String s) {
        StringBuilder b = new StringBuilder(s.length() + 8);
        b.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                case '<': b.append("\\u003c"); break; // avoid </script> breakouts
                case '>': b.append("\\u003e"); break;
                case '&': b.append("\\u0026"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        return b.append('"').toString();
    }

    // ── viewer template (same visual system as the desktop viewer) ─────────

    private static final String LOGO_SVG =
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>"
        + "<rect width='200' height='200' rx='46' fill='#2457FF'/>"
        + "<g transform='translate(34 20) scale(.88)' fill='none' stroke='#fff' stroke-width='14' stroke-linecap='round' stroke-linejoin='round'>"
        + "<path d='M23 7H98L143 52V177Q143 193 127 193H23Q7 193 7 177V23Q7 7 23 7Z'/>"
        + "<path d='M98 9V38Q98 52 112 52H141'/>"
        + "<path d='M30 76H120M42 100H108M54 124H96'/>"
        + "<path d='M75 143L85 153L75 163L65 153Z' fill='#FF3D81' stroke='none'/>"
        + "</g></svg>";

    private static final String VIEWER_TEMPLATE =
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
        + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        + "<title>__TITLE__</title><link rel=\"icon\" href=\"__FAVI__\">"
        + "<style>__FONTS__"
        + ":root{--ink:#171a23;--muted:#69707f;--line:#e6e8ee}"
        + "*{box-sizing:border-box}body{margin:0;background:#f3f4f7;color:var(--ink);"
        + "font:16px/1.7 ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}"
        + "main.doc{max-width:860px;margin:0 auto;padding:22px 16px 64px;background:#fff;"
        + "min-height:100vh;box-shadow:0 1px 30px rgba(23,26,35,.05)}"
        + "img{max-width:100%;height:auto}__FONTSTACK__</style></head><body>"
        + "<main class=\"doc\" id=\"vdf-doc\"></main>"
        + "<script src=\"__ENGINE__\"></script>"
        + "<script>(function(){var Z=window.Zolto,el=document.getElementById('vdf-doc');"
        + "if(!Z){el.innerHTML='<p style=\"color:#b00\">Zolto engine failed to load.</p>';return;}"
        + "var src=__DOC__;try{var out=Z.parse(src);el.innerHTML=Z.compile(src);"
        + "if(out.errors&&out.errors.length)console.warn('Zolto:',out.errors);"
        + "if(typeof Z.initZoltoInteractivity==='function'){try{Z.initZoltoInteractivity(document);}"
        + "catch(e){console.warn(e);}}}catch(e){el.innerHTML='<pre style=\"white-space:pre-wrap;"
        + "background:#fdecea;color:#8a1111;padding:14px;border-radius:8px\">Render error: '"
        + "+String((e&&e.message)||e)+'</pre>';}})();</script>"
        + "</body></html>";
}
