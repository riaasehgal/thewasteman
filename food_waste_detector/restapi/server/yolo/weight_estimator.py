"""
Fixed-weight lookup for Teachable Machine food classifier.

The model classifies images into three categories with known physical weights:
  - Pizza:     120 g  (±5 g)
  - Muffin:     90 g  (±5 g)
  - Croissant:  69 g  (±2 g)

No pixel-area estimation is needed — each detection maps to a fixed weight.
"""

# ── Fixed weights in kg ─────────────────────────────────────────────
FIXED_WEIGHT_KG: dict[str, float] = {
    "pizza":     0.120,
    "muffin":    0.090,
    "croissant": 0.069,
    "nothing":   0.0,
}


def is_food(category: str) -> bool:
    """Return True if the category is a recognised food item."""
    cat = category.lower()
    return cat in FIXED_WEIGHT_KG and cat != "nothing"


def estimate_weight(detected_objects: list[dict], **_kwargs) -> list[dict]:
    """
    Assign fixed weight_kg to each detected object.

    Mutates and returns the same list with 'weight_kg' added.
    """
    for obj in detected_objects:
        category = obj.get("label_name", "").lower()
        obj["weight_kg"] = FIXED_WEIGHT_KG.get(category, 0.0)
    return detected_objects


def get_weight_kg(category: str) -> float:
    """Return the fixed weight in kg for a food category."""
    return FIXED_WEIGHT_KG.get(category.lower(), 0.0)
