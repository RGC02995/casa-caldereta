import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'site-footer',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  readonly currentYear    = new Date().getFullYear();
  readonly touristLicense = 'CV-VUT0058371-V';
}
