import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import {
    BlacklistedService,
    Dataset,
    DatasetApi,
    DatasetType,
    HelgolandParameterFilter,
    HelgolandPlatform,
    Phenomenon,
    PlatformTypes,
    Service,
    Settings,
    SettingsService,
    ValueTypes,
} from '@helgoland/core';
import { NgbModal, NgbTabChangeEvent, NgbTabset } from '@ng-bootstrap/ng-bootstrap';

import { TimeseriesMapSelectionCache } from '../services/map-selection-cache.service';
import { TimeseriesRouter } from '../services/timeseries-router.service';
import { TimeseriesService } from './../services/timeseries.service';

@Component({
  selector: 'n52-map-selection',
  templateUrl: './map-selection.component.html',
  styleUrls: ['./map-selection.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TimeseriesMapSelectionComponent implements OnInit, AfterViewInit {

  @ViewChild('modalStation', { static: true })
  public modalTemplate: TemplateRef<any>;

  @ViewChild('tabset', { static: true })
  public tabset: NgbTabset;

  public datasetApis: Array<DatasetApi>;
  public providerBlacklist: Array<BlacklistedService>;
  public providerFilter: HelgolandParameterFilter;
  public selectedService: Service;

  public stationFilter: HelgolandParameterFilter;
  public phenomenonFilter: HelgolandParameterFilter;
  public selectedPhenomenonId: string;
  public cluster = true;
  public station: HelgolandPlatform;
  public datasetSelections: Array<Dataset> = [];
  public legendToggled: boolean;

  private defaultPlatformTypes = PlatformTypes.stationary;
  private defaultValueTypes = ValueTypes.quantity;

  constructor(
    private timeseriesService: TimeseriesService,
    private modalService: NgbModal,
    private settingsSrvc: SettingsService<Settings>,
    private cache: TimeseriesMapSelectionCache,
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
    this.updateStationFilter();
    this.updatePhenomenonFilter();
    const id = 'selectByMap';
    this.tabset.tabs.find(entry => entry.id === id).disabled = false;
    this.tabset.select(id);
  }

  public onStationSelected(station: HelgolandPlatform) {
    this.station = station;
    this.modalService.open(this.modalTemplate);
  }

  public onPhenomenonSelected(phenomenon: Phenomenon) {
    this.selectedPhenomenonId = phenomenon.id;
    this.updateStationFilter(phenomenon.id);
  }

  public onAllPhenomenonSelected() {
    this.selectedPhenomenonId = null;
    this.updateStationFilter();
  }

  public onDatasetSelectionChanged(datasets: Array<Dataset>) {
    this.datasetSelections = datasets;
  }

  public openDatasets() {
    if (this.datasetSelections.length > 0) {
      this.datasetSelections.forEach((entry) => {
        // Extract timeseries ID from dataset ID for REST API 2.0.0-alpha.x
        // Dataset IDs have format like 'quantity_71', but timeseries endpoint needs just '71'
        const timeseriesId = this.extractTimeseriesId(entry.internalId);
        this.timeseriesService.addDataset(timeseriesId);
        this.router.navigateToDiagram();
      });
    }
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

  private updateStationFilter(phenomenonId?: string) {
    this.stationFilter = {
      type: DatasetType.Timeseries,
      service: this.selectedService.id
    };
    if (phenomenonId) { this.stationFilter.phenomenon = phenomenonId; }
  }

  private updatePhenomenonFilter() {
    this.phenomenonFilter = {
      type: DatasetType.Timeseries,
      service: this.selectedService.id
    };
  }
}
