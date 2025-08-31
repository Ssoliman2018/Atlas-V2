import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { ExploreComponent } from './explore/explore';
import { TabbedCategoryComponent } from './tabbed-category/tabbed-category';
import { ExploreMapComponent } from './explore-map/explore-map';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'explore', component: ExploreComponent },
  { path: 'tabbed-category', component: TabbedCategoryComponent },
  { path: 'explore-map', component: ExploreMapComponent }
];
