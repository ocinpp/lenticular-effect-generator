# Lenticular Effect Generator WebApp

A Vue 3 + TypeScript web application that creates stunning lenticular effect cards using multiple images. The app allows users to upload 2-5 images, crop them to a consistent aspect ratio, and view them with an interactive lenticular effect that responds to device tilt or manual controls.

## 🎯 Features

- **Multi-Image Support**: Upload 2-5 images for complex lenticular effects
- **Smart Cropping**: Crop images to a mobile-optimized 3:4 portrait aspect ratio
- **Dual Control Modes**:
  - Auto mode using device gyroscope/accelerometer
  - Manual mode with drag controls and sliders
- **Real-time 3D Rendering**: WebGL-based lenticular effect using Three.js
- **Mobile-First Design**: Responsive interface optimized for mobile devices with touch support
- **Progressive Web App**: Works offline and can be installed on devices

## 🔧 Technology Stack

- **Frontend Framework**: Vue 3 with Composition API
- **Language**: TypeScript
- **3D Graphics**: Three.js with TresJS (Vue wrapper)
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite
- **Device Sensors**: DeviceOrientationEvent API

## 📱 How It Works

### 1. Application Flow

```
Start Screen → Image Upload → Image Cropping → Lenticular Preview
     ↓              ↓              ↓              ↓
Mode Selection → Step-by-Step → 3:4 Portrait → Real-time Effect
```

### 2. Core Components

#### **StartScreen.vue**

- Mode selection (Auto/Manual)
- Gyroscope permission handling
- App introduction and feature overview

#### **ImageUploader.vue**

- Drag & drop file upload
- File validation and preview
- Support for JPG, PNG, GIF formats

#### **ImageCropper.vue**

- Interactive crop area with 3:4 portrait aspect ratio constraint
- Touch-enabled drag to reposition, pinch corner to resize
- Visual grid overlay for composition guidance
- Outputs standardized 600x800px portrait images

#### **LenticularCard.vue**

- 3D canvas container with touch and mouse interaction handling
- Drag/swipe support for manual control
- Real-time tilt value display and status indicators

#### **LenticularPlane.vue**

- WebGL shader-based lenticular effect
- Multi-texture blending based on viewing angle
- Parallax offset for depth perception
- Visual enhancement effects (shimmer, rainbow lines)

#### **DeviceOrientationHandler.vue**

- Device orientation permission management
- Gyroscope data processing and normalization
- Cross-platform compatibility (iOS/Android)

### 3. Lenticular Effect Algorithm

The lenticular effect is achieved through a custom WebGL fragment shader that:

1. **Creates Fine Strips**: Divides the image into very thin vertical strips (0.003 width)
2. **Maps Tilt to Images**: Converts device tilt (-1 to 1) to image selection
3. **Blends Between Images**: Smoothly transitions between adjacent images
4. **Adds Visual Effects**:
   - Vertical lines to simulate lenticular lens ridges
   - Shimmer effect for realistic light reflection
   - Subtle rainbow effect on the ridges
   - Parallax offset for depth perception

### 4. Mobile-Optimized Aspect Ratio System

All images are processed to maintain a consistent **3:4 portrait aspect ratio**:

- **Why 3:4 Portrait?**: Perfect for mobile viewing in both orientations
- **Mobile First**: Optimized for smartphone screens where most users interact
- **Touch Friendly**: Larger touch targets and better ergonomics
- **Input**: Any aspect ratio image
- **Cropping**: User selects 3:4 portrait area of interest
- **Output**: 600x800px standardized portrait images
- **Display**: 3.75x5 unit 3D plane maintaining proportions

**Benefits of 3:4 Portrait over Landscape**:

- **Natural mobile viewing**: Fits perfectly in portrait orientation
- **Better thumb reach**: Easier to interact with on phones
- **Reduced scrolling**: More content visible without scrolling
- **Instagram-friendly**: Matches popular social media formats

### 5. Touch and Mobile Interaction

#### **Touch Support**

- **Drag to Move**: Touch and drag crop area to reposition
- **Pinch to Resize**: Touch corner handle and drag to resize
- **Swipe Control**: Horizontal swipe on lenticular card for manual effect
- **Prevent Scrolling**: `touch-action: none` prevents page scrolling during interaction

#### **Mobile Optimizations**

- **Fixed Bottom Bars**: Action buttons always visible and accessible
- **Larger Touch Targets**: 44px minimum touch targets for accessibility
- **Visual Feedback**: Clear hover states and active states for touch
- **Responsive Layout**: Adapts to different screen sizes and orientations

### 6. Control Modes

#### **Auto Mode (Gyroscope)**

- Detects device orientation changes
- Maps gamma rotation (-90° to 90°) to tilt value (-1 to 1)
- Requires user permission on iOS 13+
- Provides hands-free interaction

#### **Manual Mode**

- Touch/mouse drag interaction
- Slider control for precise adjustment
- Smooth return-to-center animation
- Works on all devices without permissions

### 7. Performance Optimizations

- **Image Resizing**: Automatically resizes large images to max 1024px
- **Texture Compression**: JPEG compression at 80% quality
- **Shader Efficiency**: Pre-compiled shaders with optimized uniforms
- **Memory Management**: Proper cleanup of event listeners and resources
- **Touch Event Optimization**: Passive event listeners where appropriate

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd lenticular-effect-generator

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Usage

1. **Start the App**: Open in browser and click "Start Creating"
2. **Select Mode**: Choose Auto (gyroscope) or Manual (drag) control
3. **Upload Images**: Add 2-5 images using drag & drop or file picker
4. **Crop Images**: Adjust the 3:4 portrait crop area for each image
5. **View Effect**: Experience the lenticular effect with tilt or drag controls

## 🎨 Customization

### Aspect Ratio

To change the card aspect ratio, modify the `CARD_ASPECT_RATIO` constant in:

- `src/components/ImageCropper.vue`
- `src/components/LenticularPlane.vue`

Popular alternatives:

- `16/10` - Widescreen format
- `1/1` - Square format
- `16/9` - Video format

### Shader Effects

Customize the lenticular effect by modifying the fragment shader in `LenticularPlane.vue`:

- `stripWidth`: Controls lenticular strip density
- `lineIntensity`: Adjusts ridge visibility
- `shimmer`: Controls light reflection effect

### Visual Design

The app uses Tailwind CSS for styling. Key design tokens:

- Color scheme: Slate/Purple gradient backgrounds
- Typography: Inter font family
- Spacing: 8px grid system
- Animations: Smooth transitions and micro-interactions

## 📱 Browser Support

- **Chrome/Edge**: Full support including gyroscope and touch
- **Safari**: Full support with permission prompts and touch
- **Firefox**: Manual mode with touch support (limited gyroscope)
- **Mobile Browsers**: Optimized experience with full touch controls

## 🔒 Privacy & Permissions

- **Device Orientation**: Only requested when Auto mode is selected
- **File Access**: Images processed locally, never uploaded to servers
- **Storage**: No persistent data storage, session-only

## 🐛 Troubleshooting

### Gyroscope Not Working

- Ensure HTTPS connection (required for device sensors)
- Grant permission when prompted
- Try refreshing the page
- Fall back to Manual mode if issues persist

### Touch Controls Not Responding

- Ensure you're touching the crop area or resize handle directly
- Try refreshing the page if touch events become unresponsive
- Check that browser supports touch events

### Performance Issues

- Reduce image file sizes before upload
- Use fewer images (2-3 instead of 5)
- Close other browser tabs
- Try on a device with better GPU support

### Layout Issues on Mobile

- Ensure viewport meta tag is present
- Check that bottom controls are visible
- Try rotating device if layout appears cramped

## 🔧 Recent Fixes & Improvements

### Version 1.1.0 - Mobile Optimization Update

#### **Fixed Issues:**

1. **Desktop Bottom Bar Visibility**: Fixed bottom action buttons being cut off on desktop screens
2. **Mobile Aspect Ratio**: Switched to 3:4 portrait ratio optimized for mobile devices
3. **Touch Controls**: Added comprehensive touch support for drag-to-move and pinch-to-resize
4. **Control Mode Logic**: Fixed confusing button behavior in mode selection
5. **TypeScript Errors**: Resolved all compilation errors for better development experience

#### **New Features:**

- **Fixed Bottom Bars**: Action buttons now always visible and accessible
- **Touch-First Design**: All interactions optimized for touch devices
- **Portrait Aspect Ratio**: 3:4 ratio perfect for mobile viewing
- **Better Visual Feedback**: Enhanced touch states and interaction indicators
- **Improved Layout**: Better spacing and organization for mobile interfaces

#### **Technical Improvements:**

- **Event Handling**: Proper touch event management with passive listeners
- **Memory Management**: Better cleanup of event listeners and resources
- **Performance**: Optimized touch interactions and reduced layout thrashing
- **Accessibility**: Larger touch targets and better contrast ratios

## 📄 License

This project is open source and available under the MIT License.
