# Export Article Platform Redesign

## Overview
This document outlines the redesign of the Export Article modal to provide a superior user experience through better structure, visual hierarchy, and clear affordances.

## Redesign Goals
1. **Structural Clarity**: Transition from a vertical list of connections to a structured platform grid.
2. **Visual Hierarchy**: Clear Title ("Export Article") and Subtitle ("Select destination").
3. **Clickable Cards**: Large, touch-friendly cards for each platform with logos and descriptions.
4. **Status Awareness**: Immediate visual feedback on connection status for each platform.
5. **Standardized CTAs**: Primary action "Export Now" and secondary "Cancel".

## Implementation Details

### Grid Layout
The platform selector will use a responsive grid (2 columns on mobile, 2-3 on desktop) to display available CMS integrations.

### Card Components
Each `PlatformCard` will include:
- **Logo**: Using `CMSPlatformIcon` or `WordPressIcon`.
- **Title**: Platform name (e.g., WordPress, Webflow).
- **Description**: Short text describing the destination.
- **Badge**: A status indicator showing "Connected" or "Not Connected".

### Component Mapping
| Element | Redesign Value |
|---------|----------------|
| Modal Title | Export Article |
| Modal Subtitle | Select destination |
| Selection Type | Multi-step (Platform -> Connection -> Settings) |
| Layout | `grid-cols-2` |
| Primary CTA | Export Now |
| Secondary CTA | Cancel |

## Design Compliance
- **Colors**: Restricted to grayscale for all functional elements.
- **Typography**: Enhanced font weights for hierarchy.
- **Interactions**: Focus on surface-level clickable cards without relying on hover-only effects.
