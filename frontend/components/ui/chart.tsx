export const BarChart = ({ data, layout, margin, children }: any) => {
  return <svg className="bar-chart">{children}</svg>
}

export const Bar = ({ dataKey, fill, radius }: any) => {
  return <rect className="bar" />
}

export const XAxis = ({ type, domain, tickFormatter }: any) => {
  return null
}

export const YAxis = ({ type, dataKey, tick }: any) => {
  return null
}

export const CartesianGrid = ({ strokeDasharray, horizontal, vertical }: any) => {
  return null
}

export const Tooltip = ({ formatter, labelFormatter }: any) => {
  return null
}

export const ResponsiveContainer = ({ width, height, children }: any) => {
  return <div className="responsive-container">{children}</div>
}
