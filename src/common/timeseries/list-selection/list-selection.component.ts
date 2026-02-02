import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
    BlacklistedService,
    DatasetApi,
    DatasetType,
    HelgolandDataset,
    HelgolandParameterFilter,
    Provider,
    Service,
    Settings,
    SettingsService,
} from '@helgoland/core';
import { ListSelectorParameter, MultiServiceFilterEndpoint } from '@helgoland/selector';
import { NgbTabChangeEvent, NgbTabset } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';

import { TimeseriesListSelectionCache } from '../services/list-selection-cache.service';
import { TimeseriesRouter } from '../services/timeseries-router.service';
import { TimeseriesService } from './../services/timeseries.service';

@Component({
  selector: 'n52-list-selection',
  templateUrl: './list-selection.component.html',
  styleUrls: ['./list-selection.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TimeseriesListSelectionComponent implements OnInit, AfterViewInit {

  public categoryParams: Array<ListSelectorParameter> = [{
    type: MultiServiceFilterEndpoint.category,
    header: this.translate.instant('list-selection.parameter.category')
  }, {
    type: MultiServiceFilterEndpoint.feature,
    header: this.translate.instant('list-selection.parameter.station')
  }, {
    type: MultiServiceFilterEndpoint.phenomenon,
    header: this.translate.instant('list-selection.parameter.phenomenon')
  }, {
    type: MultiServiceFilterEndpoint.procedure,
    header: this.translate.instant('list-selection.parameter.sensor')
  }];

  public stationParams: Array<ListSelectorParameter> = [{
    type: MultiServiceFilterEndpoint.feature,
    header: this.translate.instant('list-selection.parameter.station')
  }, {
    type: MultiServiceFilterEndpoint.category,
    header: this.translate.instant('list-selection.parameter.category')
  }, {
    type: MultiServiceFilterEndpoint.phenomenon,
    header: this.translate.instant('list-selection.parameter.phenomenon')
  }, {
    type: MultiServiceFilterEndpoint.procedure,
    header: this.translate.instant('list-selection.parameter.sensor')
  }];

  public phenomenonParams: Array<ListSelectorParameter> = [{
    type: MultiServiceFilterEndpoint.phenomenon,
    header: this.translate.instant('list-selection.parameter.phenomenon')
  }, {
    type: MultiServiceFilterEndpoint.category,
    header: this.translate.instant('list-selection.parameter.category')
  }, {
    type: MultiServiceFilterEndpoint.feature,
    header: this.translate.instant('list-selection.parameter.station')
  }, {
    type: MultiServiceFilterEndpoint.procedure,
    header: this.translate.instant('list-selection.parameter.sensor')
  }];

  public procedureParams: Array<ListSelectorParameter> = [{
    type: MultiServiceFilterEndpoint.procedure,
    header: this.translate.instant('list-selection.parameter.sensor')
  }, {
    type: MultiServiceFilterEndpoint.feature,
    header: this.translate.instant('list-selection.parameter.station')
  }, {
    type: MultiServiceFilterEndpoint.phenomenon,
    header: this.translate.instant('list-selection.parameter.phenomenon')
  }, {
    type: MultiServiceFilterEndpoint.category,
    header: this.translate.instant('list-selection.parameter.category')
  }];

  @ViewChild('tabset', { static: true })
  public tabset: NgbTabset;

  public datasetApis: Array<DatasetApi>;
  public providerBlacklist: Array<BlacklistedService>;
  public providerFilter: HelgolandParameterFilter;
  public parameterFilter: HelgolandParameterFilter = { type: DatasetType.Timeseries };
  public selectedService: Service;

  public selectedProviderList: Array<Provider>;

  constructor(
    private timeseriesService: TimeseriesService,
    private translate: TranslateService,
    private settingsSrvc: SettingsService<Settings>,
    private cache: TimeseriesListSelectionCache,
    private cdr: ChangeDetectorRef,
    private router: TimeseriesRouter
  ) { }

  public ngOnInit() {
    this.datasetApis = this.settingsSrvc.getSettings().datasetApis;
    this.providerBlacklist = this.settingsSrvc.getSettings().providerBlackList;
    this.providerFilter = { type: DatasetType.Timeseries };
  }

  public ngAfterViewInit(): void {
    if (this.cache.selectedService) {
      this.providerSelected(this.cache.selectedService);
      this.cdr.detectChanges();
    }
    if (this.cache.lastTab) {
      this.tabset.select(this.cache.lastTab);
      this.cdr.detectChanges();
    }
    this.tabset.tabChange.subscribe((tabChange: NgbTabChangeEvent) => {
      this.cache.lastTab = tabChange.nextId;
    });
  }

  public providerSelected(service: Service) {
    this.selectedService = this.cache.selectedService = service;
    this.selectedProviderList = [{
      id: service.id,
      url: service.apiUrl
    }];
    const id = 'selectByCategory';
    this.tabset.tabs.find(entry => entry.id === id).disabled = false;
    this.tabset.select(id);
  }

  public onDatasetSelected(datasetList: Array<HelgolandDataset>) {
    datasetList.forEach(e => {
      // Extract timeseries ID from dataset ID for REST API 2.0.0-alpha.x
      // Dataset IDs have format like 'quantity_71', but timeseries endpoint needs just '71'
      const timeseriesId = this.extractTimeseriesId(e.internalId);
      this.timeseriesService.addDataset(timeseriesId);
    });
    this.router.navigateToDiagram();
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
}
