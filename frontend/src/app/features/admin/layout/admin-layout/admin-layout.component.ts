import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly currentUser   = this.authService.currentUser;
  readonly isSidebarOpen = signal(false);

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }

  logout(): void {
    this.authService.logout();
  }
}
