import os
import unicodedata


def resolve_path(path):
    """Resolve a file path handling mixed Unicode normalization (NFC/NFD)."""
    if os.path.isfile(path):
        return path
    # Try full-path normalization first
    for form in ('NFC', 'NFD'):
        normalized = unicodedata.normalize(form, path)
        if os.path.isfile(normalized):
            return normalized
    # Mixed normalization: directory may be NFC, file may be NFD (or vice-versa)
    directory = os.path.dirname(path)
    basename = os.path.basename(path)
    # Resolve the directory (try both forms)
    resolved_dir = directory
    if not os.path.isdir(resolved_dir):
        for form in ('NFC', 'NFD'):
            candidate = unicodedata.normalize(form, directory)
            if os.path.isdir(candidate):
                resolved_dir = candidate
                break
    if os.path.isdir(resolved_dir):
        nfc_base = unicodedata.normalize('NFC', basename)
        for entry in os.listdir(resolved_dir):
            if unicodedata.normalize('NFC', entry) == nfc_base:
                return os.path.join(resolved_dir, entry)
    return path
