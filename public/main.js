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
            title: "🏘️ Real Estate Visual Summary"
        };

        const hist = {
            x: filtered.map(d => d.SalePrice),
            type: "histogram",
            marker: {color: "#1f77b4"},
            name: "Price Distribution",
            xaxis: "x1", yaxis: "y1"
        };

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
            name: `${groupBy} Count`,
            xaxis: "x2", yaxis: "y2"
        };

        const qualities = [...new Set(filtered.map(d => d.OverallQual))].sort((a, b) => a - b);
        const boxPlots = qualities.map(q => ({
            y: filtered.filter(d => d.OverallQual === q).map(d => d.SalePrice),
            type: "box",
            name: `Qual ${q}`,
            boxpoints: "outliers",
            xaxis: "x3", yaxis: "y3"
        }));

        const scatter2D = {
            x: filtered.map(d => d[xAxis]),
            y: filtered.map(d => d.SalePrice),
            mode: "markers",
            type: "scatter",
            marker: {size: 6, color: "#ff7f0e"},
            name: `${xAxis} vs. Price`,
            xaxis: "x4", yaxis: "y4"
        };

        if (use3D) {
            const salePrice = filtered.map(d => d.SalePrice);

            const scatter = {
                x: filtered.map(d => d[xAxis]),
                y: filtered.map(d => d.GrLivArea),
                z: salePrice,
                mode: "markers",
                type: "scatter3d",
                marker: {
                    size: 4,
                    color: salePrice,
                    colorscale: "Portland",
                    opacity: 0.7,
                },
                name: `${xAxis} x GrLivArea x SalePrice`
            };

            const bar3d = {
                x: Object.keys(groupCounts),
                y: Object.values(groupCounts),
                z: Array(Object.keys(groupCounts).length).fill(Math.max(...salePrice)),
                mode: "markers",
                type: "scatter3d",
                marker: {
                    size: 6,
                    color: "#2ca02c",
                    symbol: "diamond",
                },
                name: `${groupBy} Count`
            };

            const box3d = qualities.map(q => ({
                x: Array(filtered.length).fill(q),
                y: Array(filtered.length).fill(0),
                z: filtered.filter(d => d.OverallQual === q).map(d => d.SalePrice),
                mode: "markers",
                type: "scatter3d",
                marker: {
                    size: 4,
                    color: "#9467bd",
                    opacity: 0.5,
                },
                name: `Qual ${q}`
            }));

            let chartData = [];
            if (selected3D === "scatter") chartData = [scatter];
            else if (selected3D === "bar") chartData = [bar3d];
            else if (selected3D === "box") chartData = box3d;
            else chartData = [scatter, bar3d, ...box3d];

            Plotly.newPlot("combined-subplot", chartData, {
                margin: {t: 60},
                height: 800,
                scene: {
                    xaxis: {title: "X"},
                    yaxis: {title: "Y"},
                    zaxis: {title: "SalePrice"}
                },
                title: `🏘️ 3D: ${selected3D.charAt(0).toUpperCase() + selected3D.slice(1)} View`
            });

        } else {
            Plotly.newPlot("combined-subplot", [hist, bar, ...boxPlots, scatter2D], layout);
        }
    }
});