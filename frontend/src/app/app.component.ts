import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ToastComponent } from './components/toast/toast.component';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { PwaInstallBannerComponent } from './components/pwa-install-banner/pwa-install-banner.component';
import { CommandPaletteComponent } from './components/command-palette/command-palette.component';
import { ThemeService } from './services/theme.service';
import { MobileNativeService } from './services/mobile-native.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastComponent, BottomNavComponent, PwaInstallBannerComponent, CommandPaletteComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'SkillBridge';
  private themeService = inject(ThemeService); // ensures theme loads on startup
  private mobileNativeService = inject(MobileNativeService); // initializes native hardware back-button, push notifications & deep links
}
