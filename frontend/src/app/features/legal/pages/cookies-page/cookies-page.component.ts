import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'cookies-page',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './cookies-page.component.html',
  styleUrl: './cookies-page.component.scss',
})
export class CookiesPageComponent {}
