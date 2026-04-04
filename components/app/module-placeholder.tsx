import { PageIntro } from "@/components/app/page-intro"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ModulePlaceholderProps = {
  eyebrow: string
  title: string
  description: string
  badges?: string[]
  checklistTitle: string
  checklist: string[]
  previewTitle: string
  previewDescription: string
  table: {
    headers: string[]
    rows: string[][]
    caption?: string
  }
}

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  badges = [],
  checklistTitle,
  checklist,
  previewTitle,
  previewDescription,
  table,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow={eyebrow}
        title={title}
        description={description}
      />

      {badges.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge} variant="outline">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_24rem]">
        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>{previewTitle}</CardTitle>
            <CardDescription>{previewDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              {table.caption ? <TableCaption>{table.caption}</TableCaption> : null}
              <TableHeader>
                <TableRow>
                  {table.headers.map((header) => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row) => (
                  <TableRow key={row.join("-")}>
                    {row.map((cell) => (
                      <TableCell key={cell}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card/85 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>{checklistTitle}</CardTitle>
            <CardDescription>這一頁的功能在下一個實作階段會接上真實資料。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-border/60 bg-background/70 p-4"
              >
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5 shrink-0">
                    Next
                  </Badge>
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
