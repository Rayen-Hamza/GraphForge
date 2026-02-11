import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar" [class.scrolled]="isScrolled()">
      <div class="navbar-inner">
        <a routerLink="/" class="brand">
          <div class="logo-mark">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="3" fill="currentColor"/>
              <circle cx="14" cy="4" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="14" cy="24" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="4" cy="14" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="24" cy="14" r="2" fill="currentColor" opacity="0.7"/>
              <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" opacity="0.5"/>
              <circle cx="21.5" cy="6.5" r="1.5" fill="currentColor" opacity="0.5"/>
              <circle cx="6.5" cy="21.5" r="1.5" fill="currentColor" opacity="0.5"/>
              <circle cx="21.5" cy="21.5" r="1.5" fill="currentColor" opacity="0.5"/>
              <line x1="14" y1="11" x2="14" y2="6" stroke="currentColor" stroke-width="1" opacity="0.4"/>
              <line x1="14" y1="17" x2="14" y2="22" stroke="currentColor" stroke-width="1" opacity="0.4"/>
              <line x1="11" y1="14" x2="6" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/>
              <line x1="17" y1="14" x2="22" y2="14" stroke="currentColor" stroke-width="1" opacity="0.4"/>
              <line x1="12" y1="12" x2="8" y2="8" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>
              <line x1="16" y1="12" x2="20" y2="8" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>
              <line x1="12" y1="16" x2="8" y2="20" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>
              <line x1="16" y1="16" x2="20" y2="20" stroke="currentColor" stroke-width="0.8" opacity="0.3"/>
            </svg>
          </div>
          <span class="brand-name">GraphForge</span>
        </a>

        <div class="nav-links">
          <a routerLink="/" class="nav-link">Home</a>
          <a href="#features" class="nav-link">Features</a>
          <a href="#how-it-works" class="nav-link">How It Works</a>
          <a href="#" class="nav-link">Docs</a>
        </div>

        <div class="nav-actions">
          <a routerLink="/chat" class="btn-cta">
            Get Started
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>

        <button class="mobile-toggle" (click)="mobileOpen.set(!mobileOpen())">
          <span></span><span></span><span></span>
        </button>
      </div>

      <!-- Mobile Menu -->
      @if (mobileOpen()) {
        <div class="mobile-menu">
          <a routerLink="/" class="mobile-link" (click)="mobileOpen.set(false)">Home</a>
          <a href="#features" class="mobile-link" (click)="mobileOpen.set(false)">Features</a>
          <a href="#how-it-works" class="mobile-link" (click)="mobileOpen.set(false)">How It Works</a>
          <a href="#" class="mobile-link" (click)="mobileOpen.set(false)">Docs</a>
          <a routerLink="/chat" class="btn-cta mobile-cta" (click)="mobileOpen.set(false)">Get Started</a>
        </div>
      }
    </nav>
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 20px;
      left: 0;
      right: 0;
      margin: 0 auto;
      z-index: 1000;
      width: calc(100% - 48px);
      max-width: 1100px;
      animation: slideDown 0.6s ease both;
    }
    .navbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(20px) saturate(1.4);
      -webkit-backdrop-filter: blur(20px) saturate(1.4);
      border: 1px solid rgba(26, 47, 30, 0.08);
      border-radius: var(--radius-xl);
      box-shadow: 0 4px 24px rgba(26, 47, 30, 0.06);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .navbar.scrolled .navbar-inner {
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 8px 32px rgba(26, 47, 30, 0.10);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--accent-primary);
    }
    .logo-mark {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      color: var(--accent-primary);
    }
    .brand-name {
      font-family: var(--font-sans);
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--accent-primary);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .nav-link {
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      border-radius: var(--radius-full);
      transition: all 0.25s ease;
      text-decoration: none;
    }
    .nav-link:hover {
      color: var(--text-primary);
      background: rgba(26, 47, 30, 0.05);
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-cta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 22px;
      background: var(--accent-orange);
      color: white;
      border: none;
      border-radius: var(--radius-full);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(232, 115, 74, 0.25);
    }
    .btn-cta:hover {
      background: var(--accent-orange-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(232, 115, 74, 0.35);
    }
    .btn-cta svg {
      transition: transform 0.25s ease;
    }
    .btn-cta:hover svg {
      transform: translateX(3px);
    }

    .mobile-toggle {
      display: none;
      flex-direction: column;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
    }
    .mobile-toggle span {
      display: block;
      width: 20px;
      height: 2px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: 0.25s;
    }

    .mobile-menu {
      display: none;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      animation: slideDown 0.3s ease both;
    }
    .mobile-link {
      padding: 12px 16px;
      font-size: 15px;
      font-weight: 500;
      color: var(--text-secondary);
      border-radius: var(--radius-md);
      transition: 0.2s;
      text-decoration: none;
    }
    .mobile-link:hover {
      background: var(--bg-surface-subtle);
      color: var(--text-primary);
    }
    .mobile-cta {
      margin-top: 8px;
      text-align: center;
      justify-content: center;
    }

    @media (max-width: 768px) {
      .navbar {
        width: calc(100% - 32px);
        top: 12px;
      }
      .nav-links, .nav-actions {
        display: none;
      }
      .mobile-toggle {
        display: flex;
      }
      .mobile-menu {
        display: flex;
      }
    }
  `]
})
export class NavbarComponent {
  isScrolled = signal(false);
  mobileOpen = signal(false);

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 20);
  }
}
