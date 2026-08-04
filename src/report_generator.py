import os
import json
import csv
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

class ReportGenerator:
    def __init__(self, json_filename="reports/enrollment_report.json", csv_filename="reports/enrollment_report.csv", pdf_filename="reports/enrollment_report.pdf"):
        self.json_filename = json_filename
        self.csv_filename = csv_filename
        self.pdf_filename = pdf_filename

        os.makedirs(os.path.dirname(json_filename), exist_ok=True)

    def generate_all_reports(self, stats: dict, roster: list):
        # JSON Report
        with open(self.json_filename, "w", encoding="utf-8") as f:
            json.dump({"stats": stats, "roster": roster}, f, indent=2)

        # CSV Report
        if roster:
            keys = roster[0].keys()
            with open(self.csv_filename, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=keys)
                writer.writeheader()
                writer.writerows(roster)

        # PDF Report
        doc = SimpleDocTemplate(self.pdf_filename, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("<b>SmartCampus AI — Student Enrollment Report</b>", styles['Title']))
        story.append(Spacer(1, 12))

        # Stats Table
        stats_data = [["Metric", "Value"]]
        for k, v in stats.items():
            stats_data.append([k.replace("_", " ").title(), str(v)])

        t = Table(stats_data, colWidths=[200, 200])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.navy),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ]))
        story.append(t)
        doc.build(story)
