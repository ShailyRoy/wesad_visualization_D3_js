// Ensure the page always starts at the top
window.onbeforeunload = () => window.scrollTo(0, 0);

// Load data from CSV files
Promise.all([
    d3.csv("unique_participants.csv"), // Participant demographic info
    d3.csv("processed_participants.csv") // Processed physiological data
])
.then(([participantsData, signalsData]) => {
    // Process participant data
    const participants = participantsData.map((d) => ({
        subject: +d.subject,
        age: +d.age,
        gender: d.gender.trim().toLowerCase(),
        dominant_hand: d.dominant_hand.trim().toLowerCase(),
        weight: +d.weight_kg,
        height: +d.height_cm,
    }));

    // Group signals by participant subject
    const groupedSignals = d3.group(signalsData, (d) => +d.subject);

    // Map data-step indices to participant subject IDs
    const indexToSubject = [null, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17];

    // Initialize Scrollama
    const scroller = scrollama();

    // Initialize the SVG for the right panel
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%");

    // Set up the Scrollama instance
    scroller
        .setup({
            step: "#left-panel section",
            offset: 0.5,
            debug: false
        })
        .onStepEnter(response => {
            // response.index is the index of the section
            updateVis(response.index, participants, groupedSignals, svg, indexToSubject);
        });

    // Initial rendering
    updateVis(0, participants, groupedSignals, svg, indexToSubject);

    // Handle window resize
    window.addEventListener('resize', scroller.resize);
})
.catch(error => console.error('Error loading data:', error));

function updateVis(index, participants, groupedSignals, svg, indexToSubject) {
    if (index === 0) {
        // Check if the glyph overview already exists
        if (!svg.select(".glyph-overview").empty()) {
            return; // If it exists, do nothing
        }

        svg.selectAll("*").remove(); // Clear other content when scrolling back
        drawGlyphOverview(svg, participants);
    } else {
        // Remove all existing content to update with participant details
       // svg.selectAll("*").remove();

        const subjectID = indexToSubject[index];
        const participant = participants.find(p => p.subject === subjectID);
        
        if (participant) {
            drawParticipantDetails(svg, participant, groupedSignals.get(participant.subject));
        }
    }
}

function drawGlyphOverview(svg, participants, groupedSignals) {
    const glyphGroup = svg.append("g")
        .attr("class", "glyph-overview")
        .attr("transform", "translate(50, 50)");

    const glyphWidth = 90;
    const glyphHeight = 80;
    const marginX = 70;
    const marginY = 170;
    const columns = 5;

    // Create a tooltip container for demographic info
    const tooltip = d3.select("body").append("div")
        .attr("class", "demographic-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("z-index", 1000)
        .style("background-color", "#fff")
        .style("padding", "10px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "8px")
        .style("box-shadow", "0px 4px 6px rgba(0, 0, 0, 0.1)")
        .style("visibility", "hidden");

    let tooltipTimeout; // Variable to manage tooltip delay

    participants.slice(0, 15).forEach((participant, i) => {
        const x = (i % columns) * (glyphWidth + marginX);
        const y = Math.floor(i / columns) * (glyphHeight + marginY);
        addLegends(svg, 20, 20);

        const glyph = glyphGroup
            .append("g")
            .attr("transform", `translate(${x}, ${y})`)
            .attr("class", "participant-glyph")
            .on("mouseover", function (event) {
                clearTimeout(tooltipTimeout); // Cancel hiding if re-entered

                // Expand animation
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("transform", `translate(${x}, ${y}) scale(1.1)`);

                // Show tooltip
                tooltip
                    .style("visibility", "visible")
                    .style("top", `${event.pageY + 10}px`)
                    .style("left", `${event.pageX + 10}px`)
                    .html(`
                        <strong>Participant ${participant.subject}</strong><br>
                        <strong>Age:</strong> ${participant.age}<br>
                        <strong>Gender:</strong> ${participant.gender.charAt(0).toUpperCase() + participant.gender.slice(1)}<br>
                        <strong>Height:</strong> ${participant.height} cm<br>
                        <strong>Weight:</strong> ${participant.weight} kg<br>
                        <strong>Dominant Hand:</strong> ${participant.dominant_hand.charAt(0).toUpperCase() + participant.dominant_hand.slice(1)}
                    `);

                // Highlight with a stroke
                d3.select(this).select("circle")
                    .attr("stroke", "#ff4500")
                    .attr("stroke-width", 3);
            })
            .on("mousemove", function (event) {
                // Update tooltip position as the mouse moves
                tooltip
                    .style("top", `${event.pageY + 10}px`)
                    .style("left", `${event.pageX + 10}px`);
            })
            .on("mouseout", function () {
                // Shrink back to original size
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("transform", `translate(${x}, ${y}) scale(1)`);

                // Remove highlight
                d3.select(this).select("circle")
                    .attr("stroke", "none");

                // Delay hiding the tooltip
                tooltipTimeout = setTimeout(() => {
                    tooltip.style("visibility", "hidden");
                }, 1000); // Tooltip stays visible for 2 seconds after mouse leaves
            });

        drawGlyph(glyph, participant);
    });
}


function drawGlyph(glyph, participant, isHighlighted = false, groundLevel = 300, leftMargin = 50) {
    const gender = participant.gender === "male" ? "male" : "female";

    // Define scales for height, limb thickness, and age-based color intensity
    const heightScale = d3.scaleLinear().domain([150, 200]).range([100, 160]); // Body height
    const weightScale = d3.scaleLinear().domain([50, 100]).range([6, 12]); // Limb thickness
    const colorScale = d3.scaleLinear().domain([24, 35]).range([0.5, 1]); // Age to brightness (min age 24, max age 35)

    const glyphHeight = heightScale(participant.height);
    const limbWidth = weightScale(participant.weight);

    // Adjust body color based on gender and brightness from age
    const baseColor = gender === "male" ? "#62aec5" : "#f678a7";
    const brightness = colorScale(participant.age/1.1);
    const bodyColor = d3.color(baseColor).brighter(brightness);

    // Adjust topMargin so that all glyphs align at the groundLevel
    const topMargin = groundLevel - glyphHeight;

    // Add head
    glyph.append("circle")
        .attr("cx", leftMargin)
        .attr("cy", topMargin - glyphHeight / 2.5) // Add top margin
        .attr("r", limbWidth * 1.4) // Scaled for consistency
        .attr("fill", bodyColor);

    // Add body
    if (gender === "male") {
        glyph.append("rect")
            .attr("x", leftMargin - glyphHeight / 8)
            .attr("y", topMargin - glyphHeight / 2.5 + glyphHeight / 10) // Start below the head
            .attr("width", glyphHeight / 3.5)
            .attr("height", glyphHeight / 1.7)
            .attr("fill", bodyColor)
            .attr("rx", 5); // Rounded edges for better appearance
    } else {
        glyph.append("path")
            .attr(
                "d",
                `M ${leftMargin - glyphHeight / 10} ${topMargin - glyphHeight / 2.5 + glyphHeight / 10}
                 L ${leftMargin + glyphHeight / 10} ${topMargin - glyphHeight / 2.5 + glyphHeight / 10}
                 L ${leftMargin + glyphHeight / 4} ${topMargin + glyphHeight / 3}
                 L ${leftMargin - glyphHeight / 4} ${topMargin + glyphHeight / 3}
                 Z`
            )
            .attr("fill", bodyColor);
    }

    // Add arms (raise one arm based on dominant hand)
    if (participant.dominant_hand === "right") {
        // Right arm raised
        glyph.append("line")
            .attr("x1", leftMargin + 5) // Shoulder position
            .attr("y1", topMargin + 30 - glyphHeight / 4)
            .attr("x2", leftMargin + 5 + glyphHeight / 4) // Raised arm
            .attr("y2", topMargin - 10 - glyphHeight / 2)
            .attr("stroke", bodyColor)
            .attr("stroke-width", limbWidth * 1.2);

        // Left arm down
        glyph.append("line")
            .attr("x1", leftMargin - 13)
            .attr("y1", topMargin - 9 - glyphHeight / 5)
            .attr("x2", leftMargin - 5 - glyphHeight / 4)
            .attr("y2", topMargin + 10)
            .attr("stroke", bodyColor)
            .attr("stroke-width", limbWidth * 1.2);
    } else {
        // Left arm raised
        glyph.append("line")
            .attr("x1", leftMargin - 5) // Shoulder position
            .attr("y1", topMargin + 30 - glyphHeight / 4)
            .attr("x2", leftMargin - glyphHeight / 4) // Raised arm
            .attr("y2", topMargin - 5 - glyphHeight / 2)
            .attr("stroke", bodyColor)
            .attr("stroke-width", limbWidth * 1.2);

        // Right arm down
        glyph.append("line")
            .attr("x1", leftMargin + 10)
            .attr("y1", topMargin - 10 - glyphHeight / 5)
            .attr("x2", leftMargin + 5 + glyphHeight / 4)
            .attr("y2", topMargin + 5)
            .attr("stroke", bodyColor)
            .attr("stroke-width", limbWidth * 1.2);
    }

    // Add legs (closer together)
    const legSpacing = glyphHeight / 11; // Distance between legs
    glyph.append("line")
        .attr("x1", leftMargin + 5 - legSpacing) // Left leg
        .attr("y1", topMargin + glyphHeight / 6)
        .attr("x2", leftMargin + 3 - legSpacing) // Consistent spacing
        .attr("y2", groundLevel - 15) // Ensure both legs end at groundLevel
        .attr("stroke", bodyColor)
        .attr("stroke-width", limbWidth * 1.6);

    glyph.append("line")
        .attr("x1", leftMargin + legSpacing) // Right leg
        .attr("y1", topMargin + glyphHeight / 6)
        .attr("x2", leftMargin + legSpacing) // Consistent spacing
        .attr("y2", groundLevel - 15) // Ensure both legs end at groundLevel
        .attr("stroke", bodyColor)
        .attr("stroke-width", limbWidth * 1.6);

    // Highlight animation if applicable
    if (isHighlighted) {
        glyph.transition()
            .duration(500)
            .attr("transform", "scale(1.2)")
            .transition()
            .duration(500)
            .attr("transform", "scale(1)");
    }
}


// Function to draw participant details and scatter plot
function drawParticipantDetails(svg, participant, signals) {
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    const group = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 4})`);
    //addLegends(svg, 20, 20);
    drawGlyph(group, participant, true);  // Draw the highlighted glyph

    // Draw scatter plot
    drawScatterPlot(svg, signals, participant);
}


function addLegends(svg, topMargin = 150, leftMargin = 1050, itemSpacing = 150) {
    const legendGroup = svg.append("g")
        .attr("class", "legend-group")
        .attr("transform", `translate(${leftMargin}, ${topMargin})`); // Place at the specified margins

    const legendItems = [
        { label: "", symbol: "", color: "", radius: 6 },
        { label: "Male;", symbol: "circle", color: "#62aec5", radius: 10 },
        { label: "Female;", symbol: "circle", color: "#f678a7", radius: 10 },
        { label: "Posture: Dominant hand;", symbol: "circle", color: "", radius: 0.1 },
        { label: "", symbol: "", color: "", radius: 6 },

        { label: "Length: Height;", symbol: "", color: "", radius: 0 },
        { label: "Circle size: Weight;", symbol: "", color: "", radius: 6 },
        { label: " ", symbol: "", color: "", radius: 6 },
        { label: "Brightness: Age;", symbol: "", color: "", radius: 6 },
    ];

    // Group legend items into rows
    legendItems.forEach((item, index) => {
        const row = Math.floor(index / 5); // Divide items into rows
        const col = index % 4; // Determine column within the row

        const itemGroup = legendGroup.append("g")
            .attr("class", "legend-item")
            .attr("transform", `translate(${col * itemSpacing}, ${row * 50})`); // Adjust vertical position by row

        // Add symbols for Male and Female
        if (item.symbol === "circle") {
            itemGroup.append("circle")
                .attr("cx", 70)
                .attr("cy", 20)
                .attr("r", item.radius || 15)
                .attr("fill", item.color);
        }

        // Add labels
        itemGroup.append("text")
            .attr("x", 90)
            .attr("y", 25)
            .text(item.label)
            .attr("font-size", "20px")
            .attr("font-family", "Arial, sans-serif")
            .attr("fill", "#333")
            .attr("font-weight", "normal")
            .attr("alignment-baseline", "right");
    });
}



// Function to draw participant details with four scatter plots
function drawParticipantDetails(svg, participant, signals) {
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    // Clear previous content
    svg.selectAll("*").remove();

    // Define signal types and create a scatter plot for each
    const signalTypes = ["EDA", "BVP", "TEMP"];
    const numCols = 2; // Arrange scatter plots in two columns
    const plotWidth = (width - 100) / numCols; // Width for each plot
    const plotHeight = height / 2 - 100; // Height for each plot
    const margin = { top: 50, right: 50, bottom: 50, left: 100 };

    signalTypes.forEach((signalType, index) => {
        const chartGroup = svg.append("g")
            .attr("transform", `translate(${(index % numCols) * plotWidth + margin.left}, ${Math.floor(index / numCols) * plotHeight + margin.top})`);

        // Filter signals for the current signal type
        const signalData = signals.filter(d => d.signal === signalType);

        // Draw scatter plot for this signal type
        drawScatterAndLinePlot(chartGroup, signalData, {
            width: plotWidth - margin.left - margin.right,
            height: plotHeight - margin.top - margin.bottom,
            margin,
            title: `${signalType} (Participant ${participant.subject})`
        });
    });
}

const signalTypes = [
    { short: "EDA", full: "Electrodermal Activity" },
    { short: "BVP", full: "Blood Volume Pulse" },
    { short: "TEMP", full: "Temperature" }
];


// Function to draw a combined scatter and line plot
function drawScatterAndLinePlot(chartGroup, data, { width, height, margin, title }) {
    // Define scales
    const xScale = d3.scaleLinear()
        .domain([0, data.length - 1]) // Each data point is an index
        .range([0, width])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => +d.mean), d3.max(data, d => +d.mean)])
        .range([height, 0])
        .nice();

    // Create axes
    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}`));

    chartGroup.append("g")
        .call(d3.axisLeft(yScale).ticks(5));

    // Add line connecting the scatter points
    const line = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(+d.mean))
        .curve(d3.curveMonotoneX); // Smooth line

    chartGroup.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#62aec5")
        .attr("stroke-width", 2)
        .attr("d", line);

// Add scatter plot points (circles)
chartGroup.selectAll(".scatter-point")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "scatter-point")
    .attr("cx", (d, i) => xScale(i))
    .attr("cy", d => yScale(+d.mean))
    .attr("r", 5)
    .attr("fill", "#62aec5")
    .on("mouseover", function (event, d) {
        d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("z-index", 1000)
            .style("opacity", 1)
            .style("background", "#000")
            .style("color", "#fff") // Ensure text is visible on a black background
            .style("padding", "5px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "5px")
            .html(`
                <strong>Signal:</strong> ${d.signal}<br>
                <strong>Mean:</strong> ${(+d.mean).toFixed(2)}<br>
                <strong>Min:</strong> ${(+d.min).toFixed(2)}<br>
                <strong>Max:</strong> ${(+d.max).toFixed(2)}<br>
                <strong>Std:</strong> ${(+d.std).toFixed(2)}
            `)
            .style("left", `${event.pageX + 10}px`) // Offset by 10px from the cursor for better visibility
            .style("top", `${event.pageY + 10}px`); // Offset by 10px below the cursor for better visibility
    })
    .on("mouseout", function () {
        d3.select(".tooltip").remove();
    });

    // Add plot title
    chartGroup.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .text(title)
        .attr("font-size", "14px")
        .attr("font-family", "Arial, sans-serif");
}
function drawParticipantDetails(svg, participant, signals) {

    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    // Clear previous content
    svg.selectAll("*").remove();

    // Define signal types and create a scatter plot for each
    const signalTypes = ["EDA", "BVP", "TEMP"];
    const numCols = 2; // Arrange scatter plots in two columns
    const plotWidth = (width - 100) / numCols; // Width for each plot
    const plotHeight = height / 2 - 100; // Height for each plot
    const margin = { top: 50, right: 50, bottom: 50, left: 100 };

    // Determine color based on gender
    const lineColor = participant.gender === "female" ? "#f678a7" : "#62aec5";
    const pointColor = participant.gender === "female" ? "#f678a7" : "#62aec5";

    signalTypes.forEach((signalType, index) => {
        const chartGroup = svg.append("g")
            .attr("transform", `translate(${(index % numCols) * plotWidth + margin.left}, ${Math.floor(index / numCols) * plotHeight + margin.top})`);

        // Filter signals for the current signal type
        const signalData = signals.filter(d => d.signal === signalType);

        // Draw scatter plot for this signal type
        drawScatterAndLinePlot(chartGroup, signalData, {
            width: plotWidth - margin.left - margin.right,
            height: plotHeight - margin.top - margin.bottom,
            margin,
            title: `${signalType} (Participant ${participant.subject})`,
            lineColor,
            pointColor
        });
    });
}

function drawParticipantDetails(svg, participant, signals) {
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;

    // Clear previous content
    svg.selectAll("*").remove();

    // Define signal types with full forms
    const signalTypes = [
        { short: "EDA", full: "Electrodermal Activity" },
        { short: "BVP", full: "Blood Volume Pulse" },
        { short: "TEMP", full: "Temperature" }
    ];
    const numCols = 2; // Arrange scatter plots in two columns
    const plotWidth = (width - 100) / numCols; // Width for each plot
    const plotHeight = height / 2 - 100; // Height for each plot
    const margin = { top: 50, right: 50, bottom: 50, left: 100 };

    // Determine color based on gender
    const lineColor = participant.gender === "female" ? "#f678a7" : "#62aec5";
    const pointColor = participant.gender === "female" ? "#f678a7" : "#62aec5";

    signalTypes.forEach((signalType, index) => {
        const chartGroup = svg.append("g")
            .attr("transform", `translate(${(index % numCols) * plotWidth + margin.left}, ${Math.floor(index / numCols) * plotHeight + margin.top})`);

        // Filter signals for the current signal type
        const signalData = signals.filter(d => d.signal === signalType.short);

        // Draw scatter plot for this signal type
        drawScatterAndLinePlot(chartGroup, signalData, {
            width: plotWidth - margin.left - margin.right,
            height: plotHeight - margin.top - margin.bottom,
            margin,
            title: `${signalType.short} (${signalType.full}) (Participant ${participant.subject})`,
            lineColor,
            pointColor
        });
    });
}

// Function to draw a combined scatter and line plot
function drawScatterAndLinePlot(chartGroup, data, { width, height, margin, title, lineColor, pointColor }) {
    // Define scales
    const xScale = d3.scaleLinear()
        .domain([0, data.length - 1]) // Each data point is an index
        .range([0, width])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => +d.mean), d3.max(data, d => +d.mean)])
        .range([height, 0])
        .nice();

    // Create axes
    chartGroup.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}`));

    chartGroup.append("g")
        .call(d3.axisLeft(yScale).ticks(5));

    // Add line connecting the scatter points
    const line = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(+d.mean))
        .curve(d3.curveMonotoneX); // Smooth line

    chartGroup.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", lineColor)
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add scatter plot points (circles)
    chartGroup.selectAll(".scatter-point")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "scatter-point")
        .attr("cx", (d, i) => xScale(i))
        .attr("cy", d => yScale(+d.mean))
        .attr("r", 5)
        .attr("fill", pointColor)
        .on("mouseover", function (event, d) {
            d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("pointer-events", "none")
                .style("z-index", 1000)
                .style("opacity", 1)
                .style("background", "#000")
                .style("color", "#fff") // Ensure text is visible on a black background
                .style("padding", "5px")
                .style("border", "1px solid #ccc")
                .style("border-radius", "5px")
                .html(`
                    <strong>Signal:</strong> ${d.signal}<br>
                    <strong>Mean:</strong> ${(+d.mean).toFixed(2)}<br>
                    <strong>Min:</strong> ${(+d.min).toFixed(2)}<br>
                    <strong>Max:</strong> ${(+d.max).toFixed(2)}<br>
                    <strong>Std:</strong> ${(+d.std).toFixed(2)}
                `)
                .style("left", `${event.pageX + 10}px`) // Offset by 10px from the cursor for better visibility
                .style("top", `${event.pageY + 10}px`); // Offset by 10px below the cursor for better visibility
        })
        .on("mouseout", function () {
            d3.select(".tooltip").remove();
        });

    // Add plot title
    chartGroup.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .text(title)
        .attr("font-size", "14px")
        .attr("font-family", "Arial, sans-serif");
}
