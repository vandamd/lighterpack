listReport = function () {
    const $list = $('.lpList');
    const $categories = $('.lpCategories');
    const $chartContainer = $('.lpChart');
    const $imageModal = $('#lpImageDialog');
    const $modalOverlay = $('.lpModalOverlay');
    let chart = null;
    const list = null;
    const library = null;

    function init() {
        initEventHandlers();
        initThemeToggle();
        initShareFooter();
        normaliseSummaryTable();

        if (typeof chartData !== "undefined") {
            chartData = JSON.parse(unescape(chartData));
            addParents(chartData, false);
            chart = pies({ processedData: chartData, container: $chartContainer, hoverCallback: chartHover });
        }

        updateSummaryWeightWidth();
    }

    function WeightToMg(value, unit) {
        if (unit == 'g') {
            return value * 1000;
        } if (unit == 'kg') {
            return value * 1000000;
        } if (unit == 'oz') {
            return value * 28349.5;
        } if (unit == 'lb') {
            return value * 453592;
        }
    }

    function MgToWeight(value, unit, display) {
        if (typeof display === 'undefined') display = false;
        if (unit == 'g') {
            return Math.round(100 * value / 1000.0) / 100;
        } if (unit == 'kg') {
            return Math.round(100 * value / 1000000.0, 2) / 100;
        } if (unit == 'oz') {
            return Math.round(100 * value / 28349.5, 2) / 100;
        } if (unit == 'lb') {
            if (display) {
                let out = '';
                const poundsFloat = value / 453592.0;
                const pounds = Math.floor(poundsFloat);
                const oz = Math.round((poundsFloat % 1) * 16 * 100) / 100;
                if (pounds) {
                    out += 'lb';
                    if (pounds > 1) out += 's';
                }
            } else {
                return Math.round(100 * value / 453592.0, 2) / 100;
            }
        }
    }

    function addParents(chartData, parent) {
        if (parent) chartData.parent = parent;
        for (const i in chartData.points) {
            addParents(chartData.points[i], chartData);
        }
    }

    function chartHover(chartItem) {
        $('.hover').removeClass('hover');
        if (chartItem && chartItem.id) {
            $(`#total_${chartItem.id}`).addClass('hover');
        }
    }

    function updateSubtotalsUnit(unit) {
        $('.lpDisplaySubtotal').each(function () {
            $(this).text(MgToWeight(parseFloat($(this).attr('mg')), unit));
            $(this).next().text(unit);
        });
        updateSummaryWeightWidth();
    }

    function normaliseSummaryTable() {
        $('.lpTotals .lpLegendCell > .lpLegend').wrap('<span class="lpColorPicker"></span>');

        $('.lpTotals .lpHeader .lpCell:last-child')
            .addClass('lpSummaryWeightHeader')
            .html('<span>Weight</span>');

        $('.lpTotals .lpTotalCategory .lpCell:last-child, .lpTotals .lpFooter .lpCell:last-child').each(function () {
            const $cell = $(this);
            const $subtotal = $cell.find('.lpSubtotal');

            $cell.addClass('lpSummaryWeight');
            if ($subtotal.length) {
                $cell.empty().append($subtotal.children());
            }
        });
    }

    function updateSummaryWeightWidth() {
        let longest = 0;

        $('.lpTotals .lpDisplaySubtotal, .lpTotals .lpTotalValue').each(function () {
            longest = Math.max(longest, $.trim($(this).text()).length);
        });

        $('.lpTotals').each(function () {
            this.style.setProperty('--summary-weight-width', `${longest}ch`);
        });
    }

    function initThemeToggle() {
        const theme = window.lighterpackTheme;

        if (!theme) {
            return;
        }

        if (!$('.lpShareThemeMode').length) {
            const $listName = $('.lpShare .lpListName').first();
            $listName.wrap('<div class="lpShareHeader"></div>');
            $listName.attr('id', 'lpListName');
            $listName.addClass('headerItem');
            $listName.after('<span class="headerItem lpShareThemeMode"><button class="themeModeButton" type="button"></button></span>');
        }

        const $button = $('.lpShareThemeMode .themeModeButton');
        const updateButton = function () {
            const mode = theme.getThemeMode();
            const label = theme.labelForMode(mode);
            $button.text(label);
            $button.attr('title', `Theme: ${label}`);
        };

        updateButton();

        $button.on('click', function () {
            theme.setThemeMode(theme.nextThemeMode(theme.getThemeMode()));
            updateButton();
        });
    }

    function initShareFooter() {
        if ($('#lpFooter').length) {
            return;
        }

        $('.lpList').append([
            '<div id="lpFooter">',
            '<div class="lpSiteBy">',
            'Fork by <a class="lpHref" href="https://vandamdinh.com" target="_blank" rel="noopener noreferrer">Vandam Dinh</a>.',
            '</div>',
            '<div class="lpContact">',
            'Thank you to <a class="lpHref" href="https://www.galenmaly.com/" target="_blank" rel="noopener noreferrer">Galen Maly</a> ',
            'and <a class="lpHref" href="https://github.com/galenmaly/lighterpack/graphs/contributors" target="_blank" rel="noopener noreferrer">friends</a> ',
            'for <a class="lpHref" href="https://lighterpack.com" target="_blank" rel="noopener noreferrer">LighterPack</a>.',
            '</div>',
            '</div>',
        ].join(''));
    }

    function initEventHandlers() {
        $list.on('click', '.lpUnitSelect', function (evt) {
            evt.stopPropagation();
            $(this).toggleClass('lpOpen');
            const value = $('.lpUnit', this).val();
            $('ul', this).removeClass('oz lb g kg');
            $('ul', this).addClass(value);
        });

        $list.on('click', '.lpUnitSelect li', function () {
            const unit = $(this).text();
            const $unitSelect = $(this).parents('.lpUnitSelect');
            $('.lpDisplay', $unitSelect).text(unit);
            $('.lpUnit', $unitSelect).val(unit);
            if ($(this).parents('.lpTotalUnit').length) {
                $('.lpTotalValue', $(this).parents('.lpTotal')).text(MgToWeight(parseFloat($('.lpMG', $unitSelect).val()), unit));
                updateSubtotalsUnit(unit);
            } else {
                $('.lpWeight').each(function () {
                    const $weightCell = $(this).parent();
                    $(this).text(MgToWeight(parseFloat($('.lpMG', $weightCell).val()), unit));
                    $('.lpDisplay', $weightCell).text(unit);
                });
            }
        });

        $categories.on('click', '.lpItemImage', function () {
            const imageUrl = $(this).attr('href');

            const $modalImage = $(`<img src='${imageUrl}' />`);
            $imageModal.empty().append($modalImage);
            $modalImage.load(() => {
                $imageModal.show();
                $modalOverlay.show();
                centerDialog();
            });
        });

        $modalOverlay.on('click', () => {
            if (!$('.lpDialog:visible').hasClass('sticky')) {
                $modalOverlay.fadeOut();
                $imageModal.fadeOut();
            }
        });

        $(document).on('click', () => {
            $('.lpOpen').removeClass('lpOpen');
        });
    }

    init();
};

function centerDialog() {
    const $dialog = $('.dialog:visible');
    $dialog.css('margin-top', `${-1 * $dialog.outerHeight() / 2}px`);
}

$(() => {
    listReport();
});
