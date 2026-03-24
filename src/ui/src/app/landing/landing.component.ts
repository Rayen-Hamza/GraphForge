import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { Particles } from '../particles/particles';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, NavbarComponent, Particles],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent { }
