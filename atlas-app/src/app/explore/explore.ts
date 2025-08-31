import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [],
  templateUrl: './explore.html',
  styleUrl: './explore.scss'
})
export class ExploreComponent implements OnInit {
  @ViewChild('tabIndicator', { static: true }) tabIndicator!: ElementRef;
  
  activeTabIndex = 0;

  ngOnInit() {
    this.updateTabIndicator();
  }

  setActiveTab(index: number) {
    this.activeTabIndex = index;
    this.updateTabIndicator();
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
