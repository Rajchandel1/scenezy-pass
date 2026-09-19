from pathlib import Path
import shutil
import re
import sys

TARGET = Path("index.html")
MARKER = 'id="scenezy-location-address-fix"'

FIX_CSS = r'''
<style id="scenezy-location-address-fix">
  #factMap {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    box-sizing: border-box !important;

    display: block !important;

    overflow: visible !important;

    white-space: normal !important;
  }

  #factMap small {
    display: block !important;
    width: 100% !important;
  }

  #factMap strong {
    display: block !important;

    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;

    height: auto !important;
    max-height: none !important;

    margin: 0 !important;

    color: var(--ink) !important;

    font-size: 12px !important;
    font-weight: 600 !important;
    line-height: 1.4 !important;

    white-space: normal !important;

    visibility: visible !important;
    opacity: 1 !important;

    overflow: visible !important;
    text-overflow: clip !important;

    overflow-wrap: anywhere !important;
    word-break: break-word !important;
  }

  #factMap .mapCue {
    display: block !important;

    width: 100% !important;

    margin-top: 7px !important;

    white-space: normal !important;
  }
</style>
'''


def main():
    if not TARGET.exists():
        print("ERROR: index.html nahi mila.")
        sys.exit(1)

    html = TARGET.read_text(encoding="utf-8")

    # Prevent duplicate application.
    if MARKER in html:
        print("Already fixed. Koi change nahi kiya.")
        return

    # Confirm the actual page contains the location element/class.
    if "factMap" not in html:
        print("ERROR: index.html mein 'factMap' nahi mila.")
        print("Koi change nahi kiya.")
        sys.exit(1)

    # Backup original file.
    backup = TARGET.with_name(TARGET.name + ".backup")
    shutil.copy2(TARGET, backup)

    # Inject ONLY one new style block.
    head_match = re.search(r"</head\s*>", html, flags=re.IGNORECASE)

    if head_match:
        pos = head_match.start()
        updated = html[:pos] + FIX_CSS + "\n" + html[pos:]
        location = "before </head>"

    else:
        body_match = re.search(r"</body\s*>", html, flags=re.IGNORECASE)

        if body_match:
            pos = body_match.start()
            updated = html[:pos] + FIX_CSS + "\n" + html[pos:]
            location = "before </body>"

        else:
            updated = html + "\n" + FIX_CSS + "\n"
            location = "end of file"

    # Safety verification.
    if updated.count(MARKER) != 1:
        print("ERROR: Verification failed.")
        print("Koi change nahi kiya.")
        sys.exit(1)

    TARGET.write_text(updated, encoding="utf-8")

    print()
    print("========================================")
    print(" SCENEZY LOCATION FIX APPLIED")
    print("========================================")
    print()
    print("Changes made: 1")
    print("Type: New CSS override injected")
    print(f"Inserted: {location}")
    print()
    print("This fixes:")
    print("  - Location address visibility")
    print("  - Long address wrapping")
    print("  - 'Open in Maps' getting separated from address")
    print()
    print("NOT changed:")
    print("  - Existing HTML")
    print("  - Existing JavaScript")
    print("  - Existing CSS rules")
    print("  - Event data")
    print("  - Google Maps functionality")
    print()
    print(f"Backup: {backup}")
    print("========================================")


if __name__ == "__main__":
    main()