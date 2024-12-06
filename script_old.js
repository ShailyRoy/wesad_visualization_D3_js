// Load Data
Promise.all([
  d3.csv("unique_participants.csv"), // Unique participants (15 people)
  d3.csv("processed_participants.csv") // Full dataset with signals
]).then(([uniqueData, fullData]) => {
  // Parse unique participants
  const participants = uniqueData.map((d) => ({
    subject: d.subject,
    age: +d.age,
    gender: d.gender.trim().toLowerCase(),
    hand: d.dominant_hand.trim().toLowerCase(),
    weight: +d.weight_kg,
    height: +d.height_cm,
  }));

  // Parse full data for signals
  const groupedData = d3.group(fullData, (d) => d.subject);

  // Visualization Dimensions
  const width = 1200;
  const height = 600;
  const iconSize = 100;

  // Color scheme for different signals
  const colorScale = d3
    .scaleOrdinal()
    .domain(["EDA", "BVP", "TEMP", "ACC"])
    .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"]);

  // Create SVG for Glyph Visualization
  const svg = d3
    .select("#visualization")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Create Tooltip
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Draw Glyphs for Unique Participants
  const glyphs = svg
    .selectAll("g.glyph")
    .data(participants)
    .enter()
    .append("g")
    .attr("class", "glyph")
    .attr("transform", (_, i) => {
      const x = (i % 5) * (iconSize * 2) + 100;
      const y = Math.floor(i / 5) * (iconSize * 2) + 100;
      return `translate(${x}, ${y})`;
    })
    .on("mouseover", function (event, d) {
      // Highlight glyph and show tooltip
      d3.select(this).classed("highlighted", true);
      tooltip
        .style("opacity", 1)
        .html(
          `Subject: ${d.subject}<br>Age: ${d.age}<br>Gender: ${d.gender}<br>Hand: ${d.hand}<br>Weight: ${d.weight}kg<br>Height: ${d.height}cm`
        )
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 10}px`);
    })
    .on("mouseout", function () {
      // Remove highlight and hide tooltip
      d3.select(this).classed("highlighted", false);
      tooltip.style("opacity", 0);
    })
    .on("click", function (event, d) {
      // Render scatter plots for the selected participant
      renderScatterPlot(d.subject);
    });

  // Add Glyph Shapes
  glyphs.each(function (d) {
    const group = d3.select(this);

    // Body Line
    group
      .append("line")
      .attr("x1", 0)
      .attr("y1", 20)
      .attr("x2", 0)
      .attr("y2", 60)
      .attr("stroke", "black")
      .attr("stroke-width", 3);

    // Head Circle
    group
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 10)
      .attr("r", 10)
      .attr("fill", d.gender === "male" ? "blue" : "pink");

    // Arms
    group
      .append("line")
      .attr("x1", -20)
      .attr("y1", 30)
      .attr("x2", 20)
      .attr("y2", 30)
      .attr("stroke", "black")
      .attr("stroke-width", 3);

    // Right-Hand Highlight
    if (d.hand === "right") {
      group
        .append("circle")
        .attr("cx", 20)
        .attr("cy", 30)
        .attr("r", 5)
        .attr("fill", "black");
    }

    // Left-Hand Highlight
    if (d.hand === "left") {
      group
        .append("circle")
        .attr("cx", -20)
        .attr("cy", 30)
        .attr("r", 5)
        .attr("fill", "black");
    }

    // Legs
    group
      .append("line")
      .attr("x1", -10)
      .attr("y1", 60)
      .attr("x2", 0)
      .attr("y2", 80)
      .attr("stroke", "black")
      .attr("stroke-width", 3);
    group
      .append("line")
      .attr("x1", 10)
      .attr("y1", 60)
      .attr("x2", 0)
      .attr("y2", 80)
      .attr("stroke", "black")
      .attr("stroke-width", 3);
  });

  // Render Scatter Plot
  function renderScatterPlot(subject) {
    const data = groupedData.get(subject);
    if (!data) return;

    const signals = d3.group(data, (d) => d.signal);

    // Remove any existing plot
    d3.select("#boxplot").html("");

    // Create SVG for scatter plot
    const scatterSvg = d3
      .select("#boxplot")
      .append("svg")
      .attr("width", 800)
      .attr("height", 400);

    // Calculate y-scale based on mean values
    const maxMean = d3.max(data, (d) => +d.mean);
    const minMean = d3.min(data, (d) => +d.mean);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain([...signals.keys()])
      .range([50, 750])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([minMean, maxMean]) // Dynamically scaled to the mean values
      .nice()
      .range([350, 50]);

    // Axes
    scatterSvg
      .append("g")
      .attr("transform", "translate(0,350)")
      .call(d3.axisBottom(xScale));

    scatterSvg
      .append("g")
      .attr("transform", "translate(50,0)")
      .call(d3.axisLeft(yScale));

    // Add Y-Axis Label
    scatterSvg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 20)
      .attr("x", -200)
      .attr("dy", "-2em")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Mean Value");

    // Draw Scatter Points for each signal for the selected subject
    signals.forEach((signalData, signal) => {
      const x = xScale(signal);

      scatterSvg
        .selectAll(`circle.${signal}`)
        .data(signalData)
        .enter()
        .append("circle")
        .attr("class", signal)
        .attr("cx", () => x + xScale.bandwidth() / 2)
        .attr("cy", (d) => yScale(+d.mean))
        .attr("r", 3) // Smaller circle size
        .attr("fill", colorScale(signal))
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 6).attr("stroke", "black").attr("stroke-width", 1.5); // Highlight on hover
          tooltip
            .style("opacity", 1)
            .html(
              `Signal: ${d.signal}<br>Mean: ${d.mean}<br>Min: ${d.min}<br>Max: ${d.max}<br>Std: ${d.std}`
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 10}px`);
        })
        .on("mouseout", function () {
          d3.select(this).attr("r", 3).attr("stroke", "none"); // Reset highlight
          tooltip.style("opacity", 0);
        });
    });
  }
});
