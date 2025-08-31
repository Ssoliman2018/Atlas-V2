import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tabbed-category',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabbed-category.html',
  styleUrl: './tabbed-category.scss'
})
export class TabbedCategoryComponent implements OnInit {
  @ViewChild('tabIndicator', { static: true }) tabIndicator!: ElementRef;
  
  activeTabIndex = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateTabIndicator();
  }

  setActiveTab(index: number) {
    this.activeTabIndex = index;
    this.updateTabIndicator();
  }

  navigateToExploreMap() {
    this.router.navigate(['/explore-map']);
  }

  private updateTabIndicator() {
    setTimeout(() => {
      const tabs = document.querySelectorAll('.nav-tab');
      if (tabs[this.activeTabIndex] && this.tabIndicator) {
        const activeTab = tabs[this.activeTabIndex] as HTMLElement;
        const indicator = this.tabIndicator.nativeElement;
        indicator.style.left = activeTab.offsetLeft + 'px';
        indicator.style.width = activeTab.offsetWidth + 'px';
      }
    }, 0);
  }
}
