<style lang="scss">

.lpLegend {
    &:hover {
        box-shadow: 0 0 0 1px #666;
        cursor: pointer;
    }
}

.lpTotals {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";

    .lpSummaryWeight,
    .lpSummaryWeightHeader {
        padding-left: 16px;
    }

    .lpSummaryWeight {
        align-items: center;
        display: grid;
        grid-template-columns: var(--summary-weight-width) 66px;
        justify-content: end;
        text-align: left;
    }

    .lpSummaryWeightHeader {
        display: grid;
        grid-template-columns: var(--summary-weight-width) 66px;
        justify-content: end;

        span {
            text-align: left;
        }
    }

    .lpDisplaySubtotal,
    .lpTotalValue {
        text-align: right;
    }

    .lpTotalUnit {
        display: block;
        padding-left: 6px;
        padding-right: 0;
    }

    .lpSubtotalUnit,
    .lpTotalUnit {
        text-align: left;

        .lpUnitSelect {
            border: 0;
            display: grid;
            grid-template-columns: max-content 14px;
            padding: 0;
            white-space: nowrap;

            &:hover,
            &.lpHover {
                border: 0;
            }

            .lpDisplay {
                width: auto;
            }
        }
    }
}
</style>

<template>
    <div class="lpListSummary">
        <div class="lpChartContainer">
            <canvas class="lpChart" height="260" width="260" />
        </div>
        <div class="lpTotalsContainer">
            <ul class="lpTotals lpTable lpDataTable" :style="{'--summary-weight-width': summaryWeightWidth}">
                <li class="lpRow lpHeader">
                    <span class="lpCell">&nbsp;</span>
                    <span class="lpCell">
                        Category
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell">
                        Price
                    </span>
                    <span class="lpCell lpSummaryWeightHeader">
                        <span>Weight</span>
                    </span>
                </li>
                <li v-for="category in categories" :key="category.id" :class="{'hover': category.activeHover, 'lpTotalCategory lpRow': true}">
                    <span class="lpCell lpLegendCell">
                        <colorPicker v-if="category.displayColor" :color="colorToHex(category.displayColor)" @colorChange="updateColor(category, $event)" />
                    </span>
                    <span class="lpCell">
                        {{ category.name }}
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber">
                        {{ displayPrice(category.subtotalPrice, library.currencySymbol) }}
                    </span>
                    <span class="lpCell lpNumber lpSummaryWeight">
                        <span class="lpDisplaySubtotal" :mg="category.subtotalWeight">{{ displayWeight(category.subtotalWeight, library.totalUnit) }}</span><span class="lpSubtotalUnit">{{ library.totalUnit }}</span>
                    </span>
                </li>
                <li class="lpRow lpFooter lpTotal">
                    <span class="lpCell" />
                    <span class="lpCell lpSubtotal" :title="list.totalQty +' items'">
                        Total
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber lpSubtotal" :title="list.totalQty +' items'">
                        {{ displayPrice(list.totalPrice, library.currencySymbol) }}
                    </span>
                    <span class="lpCell lpNumber lpSubtotal lpSummaryWeight">
                        <span class="lpTotalValue" :title="list.totalQty + ' items'">
                            {{ displayWeight(list.totalWeight, library.totalUnit) }}
                        </span>
                        <span class="lpTotalUnit"><unitSelect :unit="library.totalUnit" :on-change="setTotalUnit" /></span>
                    </span>
                </li>
                <li v-if="list.totalConsumableWeight" data-weight-type="consumable" class="lpRow lpFooter lpBreakdown lpConsumableWeight">
                    <span class="lpCell" />
                    <span class="lpCell lpSubtotal">
                        Consumable
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber lpSubtotal">
                        {{ displayPrice(list.totalConsumablePrice, library.currencySymbol) }}
                    </span>
                    <span class="lpCell lpNumber lpSubtotal lpSummaryWeight">
                        <span class="lpDisplaySubtotal" :mg="list.totalConsumableWeight">{{ displayWeight(list.totalConsumableWeight, library.totalUnit) }}</span>
                        <span class="lpSubtotalUnit">{{ library.totalUnit }}</span>
                    </span>
                </li>
                <li v-if="list.totalWornWeight" data-weight-type="worn" class="lpRow lpFooter lpBreakdown lpWornWeight">
                    <span class="lpCell" />
                    <span class="lpCell lpSubtotal">
                        Worn
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber" />
                    <span class="lpCell lpNumber lpSubtotal lpSummaryWeight">
                        <span class="lpDisplaySubtotal" :mg="list.totalWornWeight">{{ displayWeight(list.totalWornWeight, library.totalUnit) }}</span>
                        <span class="lpSubtotalUnit">{{ library.totalUnit }}</span>
                    </span>
                </li>
                <li v-if="list.totalWornWeight || list.totalConsumableWeight" data-weight-type="base" class="lpRow lpFooter lpBreakdown lpBaseWeight">
                    <span class="lpCell" />
                    <span class="lpCell lpSubtotal" :title="displayWeight(list.totalPackWeight, library.totalUnit) + ' ' + library.totalUnit + ' pack weight (consumable + base weight)'">
                        Base Weight
                    </span>
                    <span v-if="library.optionalFields['price']" class="lpCell lpNumber" />
                    <span class="lpCell lpNumber lpSubtotal lpSummaryWeight">
                        <span class="lpDisplaySubtotal" :mg="list.totalBaseWeight" :title="displayWeight(list.totalPackWeight, library.totalUnit) + ' ' + library.totalUnit + ' pack weight (consumable + base weight)'">
                            {{ displayWeight(list.totalBaseWeight, library.totalUnit) }}
                        </span>
                        <span class="lpSubtotalUnit">{{ library.totalUnit }}</span>
                    </span>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import colorUtils from '../utils/color.js';
import pies from '../pies.js';
import utilsMixin from '../mixins/utils-mixin.js';
import colorPicker from './colorpicker.vue';
import unitSelect from './unit-select.vue';

export default {
    name: 'ListSummary',
    components: {
        colorPicker,
        unitSelect,
    },
    mixins: [utilsMixin],
    props: ['list'],
    data() {
        return {
            chart: null,
            hoveredCategoryId: null,
        };
    },
    computed: {
        library() {
            return this.$store.state.library;
        },
        categories() {
            return this.list.categoryIds.map((id) => {
                const category = this.library.getCategoryById(id);
                category.activeHover = (this.hoveredCategoryId === category.id);
                return category;
            });
        },
        summaryWeightWidth() {
            const weights = this.categories.map(category => this.displayWeight(category.subtotalWeight, this.library.totalUnit));

            weights.push(this.displayWeight(this.list.totalWeight, this.library.totalUnit));

            if (this.list.totalConsumableWeight) {
                weights.push(this.displayWeight(this.list.totalConsumableWeight, this.library.totalUnit));
            }

            if (this.list.totalWornWeight) {
                weights.push(this.displayWeight(this.list.totalWornWeight, this.library.totalUnit));
            }

            if (this.list.totalWornWeight || this.list.totalConsumableWeight) {
                weights.push(this.displayWeight(this.list.totalBaseWeight, this.library.totalUnit));
            }

            const maxLength = weights.reduce((longest, weight) => Math.max(longest, String(weight).length), 0);
            return `${maxLength}ch`;
        },
    },
    watch: {
        '$store.state.library.defaultListId': 'updateChart',
        'list.totalWeight': 'updateChart',
        'list.categoryIds': 'updateChart',
    },
    mounted() {
        this.updateChart();
    },
    methods: {
        updateChart(type) {
            const chartData = this.library.renderChart(type);

            if (chartData) {
                if (this.chart) {
                    this.chart.update({ processedData: chartData });
                } else {
                    this.chart = pies({ processedData: chartData, container: document.getElementsByClassName('lpChart')[0], hoverCallback: this.chartHover });
                }
            }
            return chartData;
        },
        chartHover(chartItem) {
            if (chartItem && chartItem.id) {
                this.hoveredCategoryId = chartItem.id;
            } else {
                this.hoveredCategoryId = null;
            }
        },
        setTotalUnit(unit) {
            this.$store.commit('setTotalUnit', unit);
        },
        updateColor(category, color) {
            category.color = colorUtils.hexToRgb(color);
            category.displayColor = colorUtils.rgbToString(colorUtils.hexToRgb(color));
            this.$store.commit('updateCategoryColor', category);
            this.updateChart();
        },
        colorToHex(color) {
            return colorUtils.rgbToHex(colorUtils.stringToRgb(color));
        },
    },
};

</script>
