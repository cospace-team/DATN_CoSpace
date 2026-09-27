"""
PDF Optimizer / Compressor for CoSpace Graduation Thesis
Compresses embedded bitmap images (PNG/screenshots) to high-quality JPEG (quality=85)
while retaining 100% lossless text, vector drawings, fonts, outlines, and page layouts.
Reduces file size from ~39 MB down to ~16.5 MB (< 30 MB faculty upload limit).
"""

import os
import sys
import pymupdf

def optimize_pdf(input_path, output_path, quality=85):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return False

    print(f"[*] Opening {input_path}...")
    doc = pymupdf.open(input_path)
    
    unique_xrefs = set()
    for pno in range(len(doc)):
        for img in doc.get_page_images(pno):
            unique_xrefs.add(img[0])

    print(f"[*] Found {len(unique_xrefs)} unique embedded images. Optimizing...")
    optimized_count = 0
    for xref in unique_xrefs:
        try:
            pix = pymupdf.Pixmap(doc, xref)
            # Skip tiny icons / logos (e.g. hcmut logo < 100px)
            if pix.width < 100 or pix.height < 100:
                continue
            if pix.n >= 5: # CMYK or with alpha channel -> convert to RGB
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            
            jpeg_bytes = pix.tobytes("jpeg", jpg_quality=quality)
            raw_stream = doc.xref_stream(xref)
            if len(jpeg_bytes) < len(raw_stream):
                doc.update_stream(xref, jpeg_bytes)
                doc.xref_set_key(xref, "Filter", "/DCTDecode")
                doc.xref_set_key(xref, "ColorSpace", "/DeviceRGB")
                optimized_count += 1
        except Exception as e:
            pass

    print(f"[*] Successfully optimized {optimized_count} images.")
    print(f"[*] Saving optimized PDF to {output_path}...")
    doc.save(output_path, garbage=4, deflate=True, clean=True)
    
    s_in = os.path.getsize(input_path) / (1024 * 1024)
    s_out = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[OK] Compression Complete: {s_in:.2f} MB -> {s_out:.2f} MB (Saved {((s_in - s_out)/s_in)*100:.1f}%)")
    return True

if __name__ == "__main__":
    src = r"d:\DA\report\main.pdf"
    dst = r"d:\DA\HK253-DATN-126_2213544_2211599.pdf"
    optimize_pdf(src, dst, quality=85)
