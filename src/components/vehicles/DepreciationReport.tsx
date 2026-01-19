import { useState, useMemo } from 'react';
import {
  TrendingDown,
  FileText,
  Truck,
  Container,
  Download,
  Clock,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import { calculateDepreciation, calculateTrailerDepreciation, DepreciationResult } from '@/hooks/useVehicleCost';
import { depreciationMethods } from '@/types/vehicle';
import { trailerDepreciationMethods } from '@/types/trailer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DepreciationReportProps {
  vehicles: Vehicle[];
  trailers: Trailer[];
}

interface DepreciationItem {
  id: string;
  name: string;
  type: 'vehicle' | 'trailer';
  licensePlate: string;
  year: number;
  purchasePrice: number;
  residualValue: number;
  depreciationMethod: string;
  depreciationYears: number;
  depreciation: DepreciationResult | null;
}

export function DepreciationReport({ vehicles, trailers }: DepreciationReportProps) {
  const [open, setOpen] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const getMethodLabel = (method: string, type: 'vehicle' | 'trailer') => {
    const methods = type === 'vehicle' ? depreciationMethods : trailerDepreciationMethods;
    return methods.find(m => m.value === method)?.label || method;
  };

  const depreciationItems = useMemo((): DepreciationItem[] => {
    const items: DepreciationItem[] = [];

    // Add vehicles
    for (const vehicle of vehicles) {
      if (vehicle.purchasePrice > 0) {
        items.push({
          id: vehicle.id,
          name: vehicle.name,
          type: 'vehicle',
          licensePlate: vehicle.licensePlate,
          year: vehicle.year,
          purchasePrice: vehicle.purchasePrice,
          residualValue: vehicle.residualValue || 0,
          depreciationMethod: vehicle.depreciationMethod || 'linear',
          depreciationYears: vehicle.depreciationYears || 5,
          depreciation: calculateDepreciation(vehicle),
        });
      }
    }

    // Add trailers
    for (const trailer of trailers) {
      if (trailer.purchasePrice > 0) {
        items.push({
          id: trailer.id,
          name: trailer.name,
          type: 'trailer',
          licensePlate: trailer.licensePlate,
          year: trailer.year,
          purchasePrice: trailer.purchasePrice,
          residualValue: trailer.residualValue || 0,
          depreciationMethod: trailer.depreciationMethod || 'linear',
          depreciationYears: trailer.depreciationYears || 7,
          depreciation: calculateTrailerDepreciation(trailer),
        });
      }
    }

    return items;
  }, [vehicles, trailers]);

  const totals = useMemo(() => {
    return depreciationItems.reduce(
      (acc, item) => {
        if (item.depreciation) {
          acc.totalPurchasePrice += item.purchasePrice;
          acc.totalResidualValue += item.residualValue;
          acc.totalBookValue += item.depreciation.currentBookValue;
          acc.totalAnnualDepreciation += item.depreciation.annualDepreciation;
          acc.totalMonthlyDepreciation += item.depreciation.monthlyDepreciation;
          acc.totalDepreciated += item.depreciation.totalDepreciated;
        }
        return acc;
      },
      {
        totalPurchasePrice: 0,
        totalResidualValue: 0,
        totalBookValue: 0,
        totalAnnualDepreciation: 0,
        totalMonthlyDepreciation: 0,
        totalDepreciated: 0,
      }
    );
  }, [depreciationItems]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('fr-FR');

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Rapport d\'Amortissement de la Flotte', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${currentDate}`, 14, 30);

    // Summary section
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Résumé', 14, 45);

    const summaryData = [
      ['Total valeur d\'achat', formatCurrency(totals.totalPurchasePrice)],
      ['Total valeur résiduelle', formatCurrency(totals.totalResidualValue)],
      ['Total valeur comptable', formatCurrency(totals.totalBookValue)],
      ['Total amorti', formatCurrency(totals.totalDepreciated)],
      ['Amortissement annuel', formatCurrency(totals.totalAnnualDepreciation)],
      ['Amortissement mensuel', formatCurrency(totals.totalMonthlyDepreciation)],
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Indicateur', 'Valeur']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
      tableWidth: 100,
    });

    // Detailed table
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(14);
    doc.text('Détail par actif', 14, finalY + 15);

    const detailData = depreciationItems.map(item => [
      item.type === 'vehicle' ? '🚛' : '📦',
      item.name,
      item.licensePlate,
      item.year.toString(),
      formatCurrency(item.purchasePrice),
      formatCurrency(item.depreciation?.currentBookValue || 0),
      formatCurrency(item.depreciation?.annualDepreciation || 0),
      item.depreciation?.remainingYears + ' an(s)' || '-',
      item.depreciation?.isFullyDepreciated ? 'Oui' : 'Non',
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Type', 'Nom', 'Immat.', 'Année', 'Prix achat', 'Val. comptable', 'Amort./an', 'Restant', 'Amorti']],
      body: detailData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 22 },
        7: { cellWidth: 18 },
        8: { cellWidth: 15 },
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `OptiFlow - Rapport d'amortissement - Page ${i}/${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`rapport-amortissement-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (depreciationItems.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Rapport Amortissement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-primary" />
            Rapport d'Amortissement Consolidé
          </DialogTitle>
          <DialogDescription>
            Vue d'ensemble de l'amortissement de votre flotte
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Valeur d'achat
              </div>
              <p className="text-xl font-bold">{formatCurrency(totals.totalPurchasePrice)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <FileText className="w-4 h-4" />
                Valeur comptable
              </div>
              <p className="text-xl font-bold text-primary">{formatCurrency(totals.totalBookValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingDown className="w-4 h-4" />
                Amort. annuel
              </div>
              <p className="text-xl font-bold text-orange-500">{formatCurrency(totals.totalAnnualDepreciation)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Clock className="w-4 h-4" />
                Amort. mensuel
              </div>
              <p className="text-xl font-bold">{formatCurrency(totals.totalMonthlyDepreciation)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress bar global */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progression globale de l'amortissement</span>
              <span className="font-medium">
                {Math.round((totals.totalDepreciated / (totals.totalPurchasePrice - totals.totalResidualValue)) * 100) || 0}%
              </span>
            </div>
            <Progress 
              value={(totals.totalDepreciated / (totals.totalPurchasePrice - totals.totalResidualValue)) * 100 || 0} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Amorti: {formatCurrency(totals.totalDepreciated)}</span>
              <span>Restant: {formatCurrency(totals.totalPurchasePrice - totals.totalResidualValue - totals.totalDepreciated)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Detail Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Immat.</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Prix achat</TableHead>
                <TableHead className="text-right">Val. comptable</TableHead>
                <TableHead className="text-right">Amort./an</TableHead>
                <TableHead className="text-center">Restant</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depreciationItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.type === 'vehicle' ? (
                      <Truck className="w-4 h-4 text-primary" />
                    ) : (
                      <Container className="w-4 h-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.licensePlate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getMethodLabel(item.depreciationMethod, item.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.purchasePrice)}</TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    {formatCurrency(item.depreciation?.currentBookValue || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.depreciation?.annualDepreciation || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.depreciation?.remainingYears || 0} an(s)
                  </TableCell>
                  <TableCell className="text-center">
                    {item.depreciation?.isFullyDepreciated ? (
                      <Badge variant="secondary">Amorti</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        En cours
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Export Button */}
        <div className="flex justify-end mt-4">
          <Button onClick={exportToPDF} className="gap-2">
            <Download className="w-4 h-4" />
            Exporter en PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
