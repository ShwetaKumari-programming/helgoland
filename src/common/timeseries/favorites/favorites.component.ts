import { Component, ViewEncapsulation } from '@angular/core';
import { marker } from '@biesbjerg/ngx-translate-extract-marker';
import { DatasetOptions, Timespan } from '@helgoland/core';
import { D3PlotOptions, HoveringStyle } from '@helgoland/d3';
import { FavoriteService, JsonFavoriteExporterService, SingleFavorite } from '@helgoland/favorite';

import { TimeseriesRouter } from '../services/timeseries-router.service';
import { TimeseriesService } from '../services/timeseries.service';

// add i18n fragments
marker('favorite.notifier.remove-favorite');
marker('favorite.notifier.add-favorite');

interface ExtendedSingleFavorite extends SingleFavorite {
  timespan: Timespan;
  option: Map<string, DatasetOptions>;
}

interface EditableExtendedSingleFavorite extends ExtendedSingleFavorite {
  editLabel: boolean;
  editedLabel: string;
  loading: boolean;
}

@Component({
  selector: 'n52-timeseries-favorites',
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TimeseriesFavoritesComponent {

  public favorites: EditableExtendedSingleFavorite[];

  public presenterOptions: D3PlotOptions = {
    hoverStyle: HoveringStyle.none,
    togglePanZoom: true,
    showTimeLabel: false
  };

  constructor(
    private favoriteSrvc: FavoriteService,
    private timeseriesService: TimeseriesService,
    private jsonExporter: JsonFavoriteExporterService,
    private router: TimeseriesRouter
  ) {
    this.loadFavorites();
  }

  public addToDiagram(favorite: ExtendedSingleFavorite) {
    // Extract timeseries ID from dataset ID for REST API 2.0.0-alpha.x
    // Dataset IDs have format like 'quantity_71', but timeseries endpoint needs just '71'
    const timeseriesId = this.extractTimeseriesId(favorite.favorite.internalId);
    this.timeseriesService.addDataset(timeseriesId);
    this.router.navigateToDiagram();
  }

  public deleteFavorite(favorite: ExtendedSingleFavorite) {
    const idx = this.favorites.findIndex(entry => entry.id === favorite.id);
    this.favorites.splice(idx, 1);
    this.favoriteSrvc.removeFavorite(favorite.id);
  }

  public setLabel(favorite: ExtendedSingleFavorite, label: string) {
    this.favoriteSrvc.changeLabel(favorite, label);
  }

  public importFavorites(event: Event) {
    this.jsonExporter.importFavorites(event).subscribe(() => this.loadFavorites());
  }

  public exportFavorites() {
    this.jsonExporter.exportFavorites();
  }

  /**
   * Extracts the timeseries ID from a dataset internal ID.
   * For REST API 2.0.0-alpha.x, dataset IDs have format like 'quantity_71', 'trajectory_71', etc.
   * but the timeseries endpoint requires just the numeric ID '71'.
   * @param internalId The dataset internal ID (may be prefixed or numeric)
   * @returns The timeseries ID (numeric part only)
   */
  private extractTimeseriesId(internalId: string): string {
    // Check if the ID contains an underscore (indicating a prefixed dataset ID)
    const lastUnderscoreIndex = internalId.lastIndexOf('_');
    if (lastUnderscoreIndex > 0) {
      // Extract the numeric part after the last underscore
      const numericPart = internalId.substring(lastUnderscoreIndex + 1);
      // Reconstruct the internalId with just the numeric part
      // Keep the URL part if it exists (format: url__id or url__prefix_id)
      const doubleUnderscoreIndex = internalId.indexOf('__');
      if (doubleUnderscoreIndex >= 0 && doubleUnderscoreIndex < lastUnderscoreIndex) {
        // Has URL prefix: keep it and append numeric ID
        return internalId.substring(0, doubleUnderscoreIndex + 2) + numericPart;
      } else {
        // No URL prefix or URL is entire part before underscore: return just numeric part
        return numericPart;
      }
    }
    // No underscore found, return as-is (already numeric or different format)
    return internalId;
  }

  private loadFavorites() {
    this.favorites = [];
    this.favoriteSrvc.getFavorites().forEach((entry) => {
      const option = new DatasetOptions(entry.favorite.internalId, '#FF0000');
      option.generalize = true;
      const timespan = new Timespan(entry.favorite.lastValue.timestamp - 604800000, entry.favorite.lastValue.timestamp);
      this.favorites.push({
        id: entry.id,
        label: entry.label,
        favorite: entry.favorite,
        editLabel: false,
        editedLabel: entry.label,
        loading: false,
        timespan,
        options: option,
        option: new Map([[entry.favorite.internalId, option]])
      });
    });
  }
}
