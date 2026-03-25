# Design System Strategy: The Digital Curator

## 1. Overview & Creative North Star
The "Digital Curator" is the creative North Star for this design system. It moves away from the utilitarian "inbox clutter" look and toward a high-end, editorial experience that treats email management as an act of intentional preservation. 

Instead of a generic dashboard, the interface behaves like a series of curated physical objects. We break the "template" look by using intentional white space (Spacing 16 and 24), layered surface tiers, and an authoritative typography scale. We favor large, breathable layouts over dense grids to signal trust and calmness—critical when a user is performing high-stakes actions like bulk-deleting data.

## 2. Colors
Our palette is rooted in Google-inspired heritage but elevated through tonal depth. We use blues for primary utility and reds for critical, high-trust actions.

*   **Primary (`#005bbf`):** The engine. Used for main actions and progress markers.
*   **Tertiary (`#bb1712`):** The "Trust Alert." Reserved for "Trash" actions and critical warnings.
*   **The "No-Line" Rule:** Sectioning must never be done with 1px solid borders. Boundaries are defined strictly through background color shifts. For instance, a `surface_container_low` sidebar should sit directly against a `surface` background. The change in tone is the divider.
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of fine paper. 
    *   Base: `surface` (`#f8fafb`)
    *   Section Container: `surface_container_low` (`#f2f4f5`)
    *   Interactive Cards: `surface_container_lowest` (`#ffffff`)
*   **The "Glass & Gradient" Rule:** To provide "soul," use subtle gradients on primary CTAs (e.g., `primary` to `primary_container`). Floating modals should utilize backdrop-blur (12px–20px) with 80% opacity on `surface_bright` to feel integrated with the environment.

## 3. Typography
We utilize **Inter** for its neutral yet modern editorial feel. The hierarchy is designed to guide the eye through the "cleaning" process.

*   **Display & Headline:** Use `display-sm` (`2.25rem`) for empty states or hero statistics. Headline-md (`1.75rem`) should be the default for page titles to establish authority.
*   **Title & Body:** `title-lg` (`1.375rem`) serves as the card header, while `body-md` (`0.875rem`) provides the high-legibility needed for email metadata.
*   **Contextual Labels:** `label-md` (`0.75rem`) is used for technical metadata (date, size), keeping the UI clean by deprioritizing non-essential text.

## 4. Elevation & Depth
Depth is a functional tool for trust, not just a decorative one. 

*   **The Layering Principle:** Avoid shadows for static elements. Instead, place a `surface_container_lowest` card on top of a `surface_container_high` background. This "Tonal Lift" creates a crisp, modern separation.
*   **Ambient Shadows:** For "floating" components like dropdowns or trashing confirmations, use an ultra-diffused shadow: `box-shadow: 0 12px 32px -4px rgba(25, 28, 29, 0.06)`. This mimics soft, natural gallery lighting.
*   **The "Ghost Border" Fallback:** If a border is required for input field clarity, use `outline_variant` at 20% opacity. Never use 100% opaque borders.
*   **Glassmorphism:** Use semi-transparent surface colors for top navigation bars or utility drawers to allow the colorful "bulk trash" actions to bleed through, maintaining a sense of place.

## 5. Components

### Buttons
*   **Primary:** High-gloss. Use `primary` background with a subtle linear gradient to `primary_container`. Roundedness: `full`.
*   **Tertiary (Destructive):** Use `tertiary` (`#bb1712`) with `on_tertiary` text. This is used exclusively for the final "Empty Trash" or "Confirm Delete" action.
*   **States:** Hover states should involve a tonal shift to `primary_fixed_dim` rather than a simple opacity change.

### Input Fields
*   **Styling:** No solid borders. Use `surface_container_high` as the background with a `0.5rem` (DEFAULT) corner radius. 
*   **Focus:** On focus, transition the background to `surface_container_lowest` and add a `2px` `primary` "Ghost Border" at 40% opacity.

### Cards & Lists
*   **Constraint:** Forbid the use of horizontal divider lines.
*   **Separation:** Use `spacing-4` (1rem) of vertical white space to separate email list items. 
*   **Selection:** A selected list item should transition its background to `primary_fixed` to feel "highlighted" by light.

### Additional: The "Trust Banner"
*   A specialized variant of a card using `tertiary_fixed` background. This is used for "Warning: This cannot be undone" messages. It uses `headline-sm` to ensure the user acknowledges the severity of the action.

## 6. Do's and Don'ts

### Do:
*   **Do** use `surface_container_highest` for "inactive" zones to push the user's focus toward the `surface_container_lowest` active work area.
*   **Do** use asymmetrical layouts. For example, a left-aligned header with a right-aligned "Global Trash" counter creates a professional, editorial rhythm.
*   **Do** ensure all interactive elements have a minimum target of 44px, leveraging the `spacing-10` and `spacing-12` tokens for padding.

### Don't:
*   **Don't** use black (`#000000`) for text. Always use `on_surface` (`#191c1d`) to maintain the sophisticated, softened look.
*   **Don't** use "Drop Shadows" on cards. Use tonal layering (`surface-container` tiers) to define edges.
*   **Don't** use standard 1px dividers. If you must separate content, use a `px` height `outline_variant` line at 10% opacity, or preferably, just white space.