using ClosedXML.Excel;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Shree.Application.Features.Bills;
using Shree.Application.Features.Reports;
using Shree.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Shree.API.Controllers;

[ApiController]
[Route("api/v1/export")]
[Authorize]
public class ExportController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ShreeDbContext _db;
    private readonly IConfiguration _config;

    public ExportController(IMediator mediator, ShreeDbContext db, IConfiguration config)
    {
        _mediator = mediator;
        _db = db;
        _config = config;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // ── Bill PDF ─────────────────────────────────────────────────────────────
    [HttpGet("bills/{id:int}/pdf")]
    public async Task<IActionResult> BillPdf(int id, CancellationToken ct)
    {
        var bill = await _mediator.Send(new GetBillByIdQuery(id), ct);
        if (bill == null) return NotFound();

        var company = _config.GetSection("Company");
        var companyName = company["Name"] ?? "Shree Engineering Works";
        var companyAddress = company["WorkAddress"] ?? "";
        var gstin = company["Gstin"] ?? "";
        var bankName = company["BankName"] ?? "";
        var accountNumber = company["AccountNumber"] ?? "";
        var ifsc = company["IfscCode"] ?? "";

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.5f, QuestPDF.Infrastructure.Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Column(col =>
                {
                    col.Item().Text(companyName).Bold().FontSize(14).AlignCenter();
                    col.Item().Text(companyAddress).FontSize(8).AlignCenter();
                    col.Item().Text($"GSTIN: {gstin}").FontSize(8).AlignCenter();
                    col.Item().PaddingVertical(4).LineHorizontal(1);
                    col.Item().Text("TAX INVOICE").Bold().FontSize(12).AlignCenter();
                });

                page.Content().PaddingTop(8).Column(col =>
                {
                    // Bill info row
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text($"Bill No: {bill.BillNumber}").Bold();
                            c.Item().Text($"Date: {bill.BillDate:dd-MM-yyyy}");
                            if (!string.IsNullOrEmpty(bill.GatepassNumber))
                                c.Item().Text($"Gatepass: {bill.GatepassNumber}");
                            if (!string.IsNullOrEmpty(bill.VehicleNumber))
                                c.Item().Text($"Vehicle: {bill.VehicleNumber}");
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Billed To:").Bold();
                            c.Item().Text(bill.CompanyName);
                        });
                    });

                    col.Item().PaddingTop(8).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(25);    // Sr
                            cols.RelativeColumn(4);      // Description
                            cols.RelativeColumn();       // Qty
                            cols.RelativeColumn();       // Rate
                            cols.RelativeColumn();       // Amount
                        });

                        // Header
                        table.Header(header =>
                        {
                            foreach (var h in new[] { "Sr.", "Description", "Qty", "Rate (₹)", "Amount (₹)" })
                                header.Cell().Background("#e5e7eb").Padding(4).Text(h).Bold();
                        });

                        int sr = 1;
                        foreach (var p in bill.Particulars)
                        {
                            table.Cell().Padding(4).Text(sr++.ToString());
                            table.Cell().Padding(4).Text(p.Description);
                            table.Cell().Padding(4).AlignRight().Text(p.Quantity.ToString("N2"));
                            table.Cell().Padding(4).AlignRight().Text(p.Price.ToString("N2"));
                            table.Cell().Padding(4).AlignRight().Text(p.Total.ToString("N2"));
                        }
                    });

                    // Tax summary
                    col.Item().PaddingTop(8).AlignRight().Column(taxCol =>
                    {
                        void TaxRow(string label, decimal value) =>
                            taxCol.Item().Row(r =>
                            {
                                r.RelativeItem().Text(label);
                                r.ConstantItem(100).AlignRight().Text($"₹ {value:N2}");
                            });

                        TaxRow("Subtotal:", bill.BillAmount);
                        if (bill.Cgst > 0) { TaxRow($"CGST ({_config["Tax:CgstRate"]}%):", bill.Cgst); TaxRow($"SGST ({_config["Tax:SgstRate"]}%):", bill.Sgst); }
                        if (bill.Igst > 0) TaxRow($"IGST ({_config["Tax:IgstRate"]}%):", bill.Igst);
                        if (bill.RoundOff != 0) TaxRow("Round Off:", bill.RoundOff);
                        taxCol.Item().PaddingTop(4).Row(r =>
                        {
                            r.RelativeItem().Text("TOTAL:").Bold();
                            r.ConstantItem(100).AlignRight().Text($"₹ {bill.BillTotal:N2}").Bold();
                        });
                    });

                    // Bank details
                    col.Item().PaddingTop(16).Column(b =>
                    {
                        b.Item().Text("Bank Details:").Bold();
                        b.Item().Text($"Bank: {bankName}");
                        b.Item().Text($"Account No: {accountNumber}");
                        b.Item().Text($"IFSC: {ifsc}");
                    });

                    if (!string.IsNullOrWhiteSpace(bill.Remarks))
                        col.Item().PaddingTop(8).Text($"Remarks: {bill.Remarks}");
                });

                page.Footer().Row(row =>
                {
                    row.RelativeItem().Text("This is a computer generated invoice.");
                    row.ConstantItem(150).AlignRight().Text("Authorised Signatory").Bold();
                });
            });
        });

        var bytes = pdf.GeneratePdf();
        return File(bytes, "application/pdf", $"Bill-{bill.BillNumber}.pdf");
    }

    // ── GSTR-1 Excel ─────────────────────────────────────────────────────────
    [HttpGet("reports/gstr1/excel")]
    public async Task<IActionResult> Gstr1Excel([FromQuery] int month, [FromQuery] int year, CancellationToken ct)
    {
        var data = await _mediator.Send(new GetGstr1Query(month, year), ct);
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("GSTR-1");

        var headers = new[] { "Bill No", "Bill Date", "Party Name", "GSTIN", "Taxable Amount", "CGST", "SGST", "IGST", "Total" };
        for (int i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];
        ws.Row(1).Style.Font.Bold = true;

        for (int r = 0; r < data.Count; r++)
        {
            var d = data[r]; int row = r + 2;
            ws.Cell(row, 1).Value = d.BillNumber;
            ws.Cell(row, 2).Value = d.BillDate.ToString("dd-MM-yyyy");
            ws.Cell(row, 3).Value = d.CompanyName;
            ws.Cell(row, 4).Value = d.CompanyGstin ?? "";
            ws.Cell(row, 5).Value = d.TaxableAmount;
            ws.Cell(row, 6).Value = d.Cgst;
            ws.Cell(row, 7).Value = d.Sgst;
            ws.Cell(row, 8).Value = d.Igst;
            ws.Cell(row, 9).Value = d.Total;
        }
        ws.Columns().AdjustToContents();

        var ms = new MemoryStream();
        wb.SaveAs(ms); ms.Position = 0;
        return File(ms, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"GSTR1-{month:D2}-{year}.xlsx");
    }

    // ── Sales Excel ───────────────────────────────────────────────────────────
    [HttpGet("reports/sales/excel")]
    public async Task<IActionResult> SalesExcel([FromQuery] int month, [FromQuery] int year, CancellationToken ct)
    {
        var data = await _mediator.Send(new GetSalesReportQuery(month, year), ct);
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Sales");

        var headers = new[] { "Bill No", "Date", "Party", "Bill Amount", "CGST", "SGST", "IGST", "Total", "Payment Status", "Received" };
        for (int i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];
        ws.Row(1).Style.Font.Bold = true;

        for (int r = 0; r < data.Items.Count; r++)
        {
            var d = data.Items[r]; int row = r + 2;
            ws.Cell(row, 1).Value = d.BillNumber;
            ws.Cell(row, 2).Value = d.BillDate.ToString("dd-MM-yyyy");
            ws.Cell(row, 3).Value = d.CompanyName;
            ws.Cell(row, 4).Value = d.BillAmount;
            ws.Cell(row, 5).Value = d.Cgst;
            ws.Cell(row, 6).Value = d.Sgst;
            ws.Cell(row, 7).Value = d.Igst;
            ws.Cell(row, 8).Value = d.BillTotal;
            ws.Cell(row, 9).Value = d.PaymentStatus;
            ws.Cell(row, 10).Value = d.PaymentReceived;
        }
        ws.Columns().AdjustToContents();

        var ms = new MemoryStream();
        wb.SaveAs(ms); ms.Position = 0;
        return File(ms, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Sales-{month:D2}-{year}.xlsx");
    }

    // ── Purchase Excel ────────────────────────────────────────────────────────
    [HttpGet("reports/purchase/excel")]
    public async Task<IActionResult> PurchaseExcel([FromQuery] int month, [FromQuery] int year, CancellationToken ct)
    {
        var data = await _mediator.Send(new GetPurchaseReportQuery(month, year), ct);
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Purchase");

        var headers = new[] { "Invoice No", "Date", "Vendor", "Amount", "Tax %", "CGST", "SGST", "IGST", "Total", "Description" };
        for (int i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];
        ws.Row(1).Style.Font.Bold = true;

        for (int r = 0; r < data.Items.Count; r++)
        {
            var d = data.Items[r]; int row = r + 2;
            ws.Cell(row, 1).Value = d.InvoiceNumber ?? "";
            ws.Cell(row, 2).Value = d.Date.ToString("dd-MM-yyyy");
            ws.Cell(row, 3).Value = d.VendorName;
            ws.Cell(row, 4).Value = d.Amount;
            ws.Cell(row, 5).Value = d.TaxPercentage;
            ws.Cell(row, 6).Value = d.Cgst;
            ws.Cell(row, 7).Value = d.Sgst;
            ws.Cell(row, 8).Value = d.Igst;
            ws.Cell(row, 9).Value = d.Total;
            ws.Cell(row, 10).Value = d.Description ?? "";
        }
        ws.Columns().AdjustToContents();

        var ms = new MemoryStream();
        wb.SaveAs(ms); ms.Position = 0;
        return File(ms, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Purchase-{month:D2}-{year}.xlsx");
    }
}
