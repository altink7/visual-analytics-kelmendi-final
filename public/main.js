document.addEventListener("DOMContentLoaded", () => {
    const priceMinSlider = document.getElementById("priceMin");
    const priceMaxSlider = document.getElementById("priceMax");
    const priceMinValue = document.getElementById("priceMinValue");
    const priceMaxValue = document.getElementById("priceMaxValue");
    const qualitySlider = document.getElementById("qualitySlider");
    const qualityValue = document.getElementById("qualityValue");
    const xAxisSelect = document.getElementById("xAxisSelect");
    const groupBySelect = document.getElementById("groupBySelect");
    const chartTypeToggle = document.getElementById("chartTypeToggle");
    const chart3DSelect = document.getElementById("chart3DSelect");
    const chart3DSelectWrapper = document.getElementById("chart3DSelectWrapper");

    let data = [];

    Papa.parse("data/data.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: function (results) {
            data = results.data.filter(d => d.SalePrice && d.GrLivArea && d.OverallQual && d.Neighborhood && d["1stFlrSF"]);
            updateControls();
            drawAll();
        },
    });

    [priceMinSlider, priceMaxSlider, qualitySlider, xAxisSelect, groupBySelect, chartTypeToggle, chart3DSelect].forEach(ctrl => {
        ctrl.addEventListener("input", () => {
            updateControls();
            drawAll();
            chart3DSelectWrapper.classList.toggle("d-none", !chartTypeToggle.checked);
        });
    });

    document.getElementById("clearFilters").addEventListener("click", () => {
        priceMinSlider.value = 0;
        priceMaxSlider.value = 800000;
        qualitySlider.value = 1;
        xAxisSelect.value = "GrLivArea";
        groupBySelect.value = "Neighborhood";
        chartTypeToggle.checked = false;
        chart3DSelect.value = "all";
        chart3DSelectWrapper.classList.add("d-none");

        updateControls();
        drawAll();
    });

    function updateControls() {
        priceMinValue.textContent = priceMinSlider.value;
        priceMaxValue.textContent = priceMaxSlider.value;
        qualityValue.textContent = qualitySlider.value;
    }

    function drawAll() {
        const minPrice = priceMinSlider.value;
        const maxPrice = priceMaxSlider.value;
        const minQuality = qualitySlider.value;
        const xAxis = xAxisSelect.value;
        const groupBy = groupBySelect.value;
        const use3D = chartTypeToggle.checked;
        const selected3D = chart3DSelect.value;

        const filtered = data.filter(d =>
            d.SalePrice >= minPrice &&
            d.SalePrice <= maxPrice &&
            d.OverallQual >= minQuality
        );

        const layout = {
            grid: {rows: 2, columns: 2, pattern: "independent"},
            height: 800,
            margin: {t: 60, l: 50, r: 20, b: 40},
            title: "🏘️ Real Estate Visual Summary",
            annotations: []
        };

        const hist = {
            x: filtered.map(d => d.SalePrice),
            type: "histogram",
            marker: {color: "#1f77b4"},
            name: "Histogram: Distribution of House Prices",
            xaxis: "x1", yaxis: "y1"
        };

        layout.xaxis1 = {title: "Sale Price (USD)"};
        layout.yaxis1 = {title: "Number of Houses"};

        const groupCounts = {};
        filtered.forEach(d => {
            const key = d[groupBy];
            groupCounts[key] = (groupCounts[key] || 0) + 1;
        });

        const bar = {
            x: Object.keys(groupCounts),
            y: Object.values(groupCounts),
            type: "bar",
            marker: {color: "#2ca02c"},
            name: `Bar Chart: ${groupBy} Count`,
            xaxis: "x2", yaxis: "y2"
        };

        layout.xaxis2 = {title: groupBy};
        layout.yaxis2 = {title: "Count"};

        const qualities = [...new Set(filtered.map(d => d.OverallQual))].sort((a, b) => a - b);
        const boxPlots = qualities.map(q => ({
            y: filtered.filter(d => d.OverallQual === q).map(d => d.SalePrice),
            type: "box",
            name: `${q}`,
            boxpoints: "outliers",
            xaxis: "x3", yaxis: "y3"
        }));

        layout.xaxis3 = {title: "Overall Quality"};
        layout.yaxis3 = {title: "Sale Price (USD)"};

        const scatter2D = {
            x: filtered.map(d => d[xAxis]),
            y: filtered.map(d => d.SalePrice),
            mode: "markers",
            type: "scatter",
            marker: {size: 6, color: "#ff7f0e"},
            name: `Scatter Plot: ${xAxis} vs SalePrice`,
            xaxis: "x4", yaxis: "y4"
        };

        layout.xaxis4 = {title: xAxis};
        layout.yaxis4 = {title: "Sale Price (USD)"};

        if (use3D) {
            const salePrice = filtered.map(d => d.SalePrice);

            const scatter = {
                x: filtered.map(d => d.GrLivArea),
                y: filtered.map(d => d["1stFlrSF"]),
                z: salePrice,
                mode: "markers",
                type: "scatter3d",
                marker: {
                    size: 4,
                    color: salePrice,
                    colorscale: "Portland",
                    opacity: 0.7,
                },
                name: "3D Scatter: GrLivArea x 1stFlrSF x SalePrice"
            };

            const neighborhoods = Object.keys(groupCounts);
            const houseCounts = Object.values(groupCounts);
            const avgQualities = neighborhoods.map(n =>
                filtered.filter(d => d.Neighborhood === n).reduce((acc, cur, i, arr) => acc + cur.OverallQual / arr.length, 0)
            );

            const bar3d = {
                x: neighborhoods,
                y: houseCounts,
                z: avgQualities,
                mode: "markers",
                type: "scatter3d",
                marker: {
                    size: 6,
                    color: avgQualities,
                    colorscale: "Viridis",
                    symbol: "diamond",
                },
                name: "3D Bar: Neighborhood Count x AvgQual"
            };

            const box3d = qualities.map(q => ({
                x: Array(filtered.length).fill(q),
                y: filtered.filter(d => d.OverallQual === q).map(d => d.TotRmsAbvGrd || 0),
                z: filtered.filter(d => d.OverallQual === q).map(d => d.SalePrice),
                mode: "markers",
                type: "scatter3d",
                marker: {
                    size: 4,
                    color: "#9467bd",
                    opacity: 0.5,
                },
                name: `3D Box: Qual ${q}`
            }));

            let chartData = [];
            if (selected3D === "scatter") chartData = [scatter];
            else if (selected3D === "bar") chartData = [bar3d];
            else if (selected3D === "box") chartData = box3d;
            else chartData = [scatter, bar3d, ...box3d];

            let xLabel = "X", yLabel = "Y", zLabel = "Z";

            if (selected3D === "scatter") {
                xLabel = "GrLivArea";
                yLabel = "1stFlrSF";
                zLabel = "SalePrice";
            } else if (selected3D === "bar") {
                xLabel = "Neighborhood";
                yLabel = "House Count";
                zLabel = "Average Quality";
            } else if (selected3D === "box") {
                xLabel = "OverallQual";
                yLabel = "TotRmsAbvGrd";
                zLabel = "SalePrice";
            }

            Plotly.newPlot("combined-subplot", chartData, {
                margin: {t: 60},
                height: 800,
                scene: {
                    xaxis: {title: xLabel},
                    yaxis: {title: yLabel},
                    zaxis: {title: zLabel}
                },
                title: `🏘️ 3D: ${selected3D.charAt(0).toUpperCase() + selected3D.slice(1)} View`
            });
        } else {
            Plotly.newPlot("combined-subplot", [hist, bar, ...boxPlots, scatter2D], layout);
        }
    }
});