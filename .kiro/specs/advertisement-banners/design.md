# Design Document

## Overview

The advertisement banners feature will add fixed-position left and right sidebar advertisements to the front layout of the application. The implementation will create reusable banner components that integrate seamlessly with the existing authentication and setup providers while maintaining responsive design principles.

## Architecture

The advertisement system will follow a component-based architecture:

1. **AdBanner Component**: A reusable component that renders individual advertisement slots
2. **AdBannerContainer**: A wrapper component that manages left and right banner positioning
3. **Layout Integration**: Modified front layout that includes the banner container
4. **CSS Module**: Dedicated styling for banner positioning and responsive behavior

### Component Hierarchy

```
Frontlayout
├── AdBannerContainer
│   ├── AdBanner (left)
│   └── AdBanner (right)
├── AnonymousAuthProvider
└── FirstTimeSetupProvider
```

## Components and Interfaces

### AdBanner Component

```typescript
interface AdBannerProps {
  position: "left" | "right";
  adId: string;
  upgradeUrl?: string;
  removeAdsText?: string;
}
```

The AdBanner component will:

- Render a 160x600 pixel advertisement container
- Include the "Remove Ads" upgrade button
- Handle ad slot initialization with unique IDs
- Support localization for button text

### AdBannerContainer Component

```typescript
interface AdBannerContainerProps {
  upgradeUrl?: string;
  removeAdsText?: string;
}
```

The container will:

- Position left and right banners using CSS Grid or Flexbox
- Handle responsive behavior (hide on mobile/tablet)
- Manage z-index layering to avoid content overlap

## Data Models

### Advertisement Configuration

```typescript
interface AdConfig {
  id: string;
  size: {
    width: number;
    height: number;
  };
  position: "left" | "right";
  upgradeUrl: string;
  removeAdsText: string;
}

interface AdSlotData {
  slotId: string;
  containerId: string;
  googleAdId?: string;
  pokiAdId?: string;
}
```

### Localization Support

```typescript
interface AdLocalization {
  removeAdsText: string;
  locale: string;
}
```

## Error Handling

### Ad Loading Failures

- Graceful degradation when ad scripts fail to load
- Fallback content or empty space when ads don't render
- Error boundaries to prevent layout breaking

### Responsive Breakpoints

- Hide banners on screens smaller than 1200px width
- Ensure main content remains accessible on all screen sizes
- Handle orientation changes on mobile devices

## Testing Strategy

### Unit Tests

- Component rendering with different props
- Button click handlers and navigation
- Responsive behavior at different breakpoints
- Error handling for failed ad loads

### Integration Tests

- Banner integration with existing layout providers
- Ad slot initialization and unique ID generation
- CSS positioning and z-index behavior
- Localization text rendering

### Visual Regression Tests

- Banner positioning across different screen sizes
- Button styling and hover states
- Layout integrity with and without ads loaded

## Implementation Details

### CSS Architecture

Using CSS modules with the following class structure:

```css
._bannerContainer_17ezv_1 {
  /* Container for both banners */
}

._leftBanner_17ezv_1 {
  /* Left banner positioning */
}

._rightBanner_17ezv_1 {
  /* Right banner positioning */
}

._adContainer_14fwb_1 {
  /* Individual ad slot container */
}

._removeAdsButton_17ezv_12 {
  /* Upgrade button styling */
}
```

### Ad Integration

- Support for Google Ads and Poki ad networks
- Dynamic ad slot creation with unique identifiers
- Iframe-based ad rendering for security
- SafeFrame implementation for ad isolation

### Performance Considerations

- Lazy loading of ad scripts to improve initial page load
- Minimal impact on Core Web Vitals
- Efficient CSS with hardware acceleration for fixed positioning
- Debounced resize handlers for responsive behavior
