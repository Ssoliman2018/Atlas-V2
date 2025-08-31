# Images Folder

This folder is for storing image assets used in your Angular application.

## Supported Formats
- PNG, JPG, JPEG, GIF, SVG, WebP

## Usage Examples

### In HTML Templates
```html
<img src="assets/images/logo.png" alt="Logo">
<img [src]="'assets/images/banner.jpg'" alt="Banner">
```

### In CSS/SCSS
```scss
.hero-section {
  background-image: url('/assets/images/hero-bg.jpg');
}
```

### In TypeScript Components
```typescript
export class MyComponent {
  imagePath = 'assets/images/logo.png';
}
```

## Best Practices
- Use descriptive filenames
- Optimize images for web (compress when possible)
- Consider using different sizes for responsive design
- Use WebP format for better performance when supported
