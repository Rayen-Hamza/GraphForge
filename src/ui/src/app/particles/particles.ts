import {
  Component,
  ElementRef,
  input,
  viewChild,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl';

const defaultColors: string[] = ['#ffffff', '#ffffff', '#ffffff'];

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(hex, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vRandom = random;
    vColor = color;
    
    vec3 pos = position * uSpread;
    pos.z *= 10.0;
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);
    
    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }
    
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  
  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    
    if(uAlphaParticles < 0.5) {
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`;

@Component({
  selector: 'app-particles',
  standalone: true,
  imports: [],
  templateUrl: './particles.html',
  styleUrls: ['./particles.css']
})
export class Particles implements OnDestroy {
  // --- Inputs (Signals) ---
  particleCount = input<number>(200);
  particleSpread = input<number>(10);
  speed = input<number>(0.1);
  particleColors = input<string[]>([]);
  moveParticlesOnHover = input<boolean>(true);
  particleHoverFactor = input<number>(1);
  alphaParticles = input<boolean>(false);
  particleBaseSize = input<number>(100);
  sizeRandomness = input<number>(1);
  cameraDistance = input<number>(20);
  disableRotation = input<boolean>(false);
  pixelRatio = input<number>(1);
  className = input<string>('');

  // --- View Child ---
  containerRef = viewChild.required<ElementRef<HTMLDivElement>>('container');

  // --- Internals ---
  private platformId = inject(PLATFORM_ID);
  private mouse = { x: 0, y: 0 };
  private animationId: number | null = null;
  private gl: any = null;
  private handleResize: (() => void) | null = null;
  private handleMouseMove: ((e: MouseEvent) => void) | null = null;

  constructor() {
    // Only initialize in browser environment to support SSR
    afterNextRender(() => {
      this.initParticles();
    });

    // Reactively re-init if inputs change (similar to useEffect dependency array)
    effect(() => {
      // Read all signals to register dependencies
      this.particleCount();
      this.particleSpread();
      this.speed();
      this.particleColors();
      this.moveParticlesOnHover();
      this.particleHoverFactor();
      this.alphaParticles();
      this.particleBaseSize();
      this.sizeRandomness();
      this.cameraDistance();
      this.disableRotation();
      this.pixelRatio();

      // Debounce slightly or just re-init if the canvas is ready
      if (this.gl) {
        this.cleanup();
        this.initParticles();
      }
    });
  }

  private initParticles() {
    if (!isPlatformBrowser(this.platformId)) return;

    const container = this.containerRef().nativeElement;
    if (!container) return;

    // renderer
    const renderer = new Renderer({ 
      dpr: this.pixelRatio(), 
      depth: false, 
      alpha: true 
    });
    this.gl = renderer.gl;
    container.appendChild(this.gl.canvas);
    this.gl.clearColor(0, 0, 0, 0);

    // camera
    const camera = new Camera(this.gl, { fov: 15 });
    camera.position.set(0, 0, this.cameraDistance());

    // resize
    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.perspective({ aspect: this.gl.canvas.width / this.gl.canvas.height });
    };
    
    this.handleResize = resize;
    window.addEventListener('resize', resize, false);
    resize();

    // Mouse Interaction
    this.handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.mouse = { x, y };
    };

    if (this.moveParticlesOnHover()) {
      container.addEventListener('mousemove', this.handleMouseMove);
    }

    // Geometry Data
    const count = this.particleCount();
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    const pColors = this.particleColors();
    const palette = pColors && pColors.length > 0 ? pColors : defaultColors;

    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number, len: number;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      positions.set([x * r, y * r, z * r], i * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
      colors.set(col, i * 3);
    }

    const geometry = new Geometry(this.gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors }
    });

    const program = new Program(this.gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: this.particleSpread() },
        uBaseSize: { value: this.particleBaseSize() * this.pixelRatio() },
        uSizeRandomness: { value: this.sizeRandomness() },
        uAlphaParticles: { value: this.alphaParticles() ? 1 : 0 }
      },
      transparent: true,
      depthTest: false
    });

    const particles = new Mesh(this.gl, { mode: this.gl.POINTS, geometry, program });

    // Animation Loop
    let lastTime = performance.now();
    let elapsed = 0;

    const update = (t: number) => {
      this.animationId = requestAnimationFrame(update);
      const delta = t - lastTime;
      lastTime = t;
      elapsed += delta * this.speed();

      program.uniforms['uTime'].value = elapsed * 0.001;

      if (this.moveParticlesOnHover()) {
        particles.position.x = -this.mouse.x * this.particleHoverFactor();
        particles.position.y = -this.mouse.y * this.particleHoverFactor();
      } else {
        particles.position.x = 0;
        particles.position.y = 0;
      }

      if (!this.disableRotation()) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
        particles.rotation.z += 0.01 * this.speed();
      }

      renderer.render({ scene: particles, camera });
    };

    this.animationId = requestAnimationFrame(update);
  }

  private cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
      this.handleResize = null;
    }

    const container = this.containerRef()?.nativeElement;
    if (container && this.handleMouseMove) {
      container.removeEventListener('mousemove', this.handleMouseMove);
      this.handleMouseMove = null;
    }
    
    if (this.gl && container && container.contains(this.gl.canvas)) {
      container.removeChild(this.gl.canvas);
    }
    
    this.gl = null;
  }

  ngOnDestroy() {
    this.cleanup();
  }
}
