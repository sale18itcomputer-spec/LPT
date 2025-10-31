import React from 'react';

/**
 * Icon Library - Tabler Icons Set
 *
 * This file contains a comprehensive set of SVG icons used throughout the application,
 * sourced from the Tabler Icons library (https://tabler-icons.io/) for a professional
 * and consistent look.
 *
 * All icons are styled to be consistent (24x24, outline, stroke-width 1.5) and are
 * theme-aware by using `stroke="currentColor"`.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

const defaultProps: IconProps = {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor"
};

export const ArchiveBoxIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9l8 -4.5" />
        <path d="M12 12l8 -4.5" /><path d="M12 12v9" /><path d="M12 12l-8 -4.5" />
        <path d="M16 5.25l-8 4.5" />
    </svg>
);

export const ArrowDownCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 7l0 10" />
        <path d="M15 14l-3 3l-3 -3" />
        <path d="M12 21a9 9 0 0 0 0 -18" />
    </svg>
);

export const ArrowDownTrayIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" />
        <path d="M12 4l0 12" />
    </svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" />
    </svg>
);

export const ArrowLongRightIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M17 12l-14 0" /><path d="M13 8l4 4l-4 4" />
    </svg>
);

export const ArrowLongUpIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 5l0 14" /><path d="M16 9l-4 -4l-4 4" />
    </svg>
);

export const ArrowPathIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
    </svg>
);

export const ArrowRightOnRectangleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
        <path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" />
    </svg>
);

export const ArrowTrendingDownIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 7l6 6l4 -4l8 8" />
      <path d="M21 10l0 7l-7 0" />
    </svg>
);

export const ArrowTrendingUpIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 17l6 -6l4 4l8 -8" />
      <path d="M14 7l7 0l0 7" />
    </svg>
);

export const ArrowUpIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 5l0 14" /><path d="M16 9l-4 -4l-4 4" />
    </svg>
);

export const ArrowUpCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 17l0 -14" /><path d="M15 6l-3 -3l-3 3" /><path d="M12 21a9 9 0 0 0 0 -18" />
    </svg>
);

export const ArrowsPointingOutIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 20h4v-4" /><path d="M16 4h4v4" /><path d="M4 4l6 6" /><path d="M20 20l-6 -6" />
    </svg>
);

export const ArrowsRightLeftIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M21 17l-18 0" /><path d="M18 20l3 -3l-3 -3" /><path d="M3 7l18 0" /><path d="M6 4l-3 3l3 3" />
    </svg>
);

export const BanknotesIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M16.7 8a3 3 0 0 0 -2.7 -2h-4a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-4a3 3 0 0 1 -2.7 -2" />
        <path d="M12 3v3m0 12v3" />
    </svg>
);

export const BarsArrowDownIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 6l16 0" /><path d="M4 12l10 0" /><path d="M4 18l14 0" />
        <path d="M15 15l3 3l3 -3" /><path d="M18 6l0 12" />
    </svg>
);

export const BarsArrowUpIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 6l16 0" /><path d="M4 12l10 0" /><path d="M4 18l14 0" />
        <path d="M15 9l3 -3l3 3" /><path d="M18 6l0 12" />
    </svg>
);

export const BellIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M10 5a2 2 0 0 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
        <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
    </svg>
);

export const BuildingStorefrontIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 21l18 0" /><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4" />
        <path d="M5 21l0 -10.15" /><path d="M19 21l0 -10.15" /><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4" />
    </svg>
);

export const BullseyeIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 15m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
    </svg>
);

export const CalendarDaysIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" />
        <path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M11 15h1" /><path d="M12 15v3" />
    </svg>
);

export const ChartBarIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
        <path d="M9 8m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
        <path d="M15 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" />
        <path d="M4 20l14 0" />
    </svg>
);

export const ChartPieIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M10 3.2a9 9 0 1 0 10.8 10.8a1 1 0 0 0 -1 -1h-6.8a2 2 0 0 1 -2 -2v-7a.9 .9 0 0 0 -1 -.8" />
        <path d="M15 3.5a9 9 0 0 1 5.5 5.5h-4.5a1 1 0 0 1 -1 -1v-4.5" />
    </svg>
);

export const ChatBubbleLeftEllipsisIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M12 20l-3 -3h-3a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-3l-3 3z" />
      <path d="M8 9h.01" /><path d="M12 9h.01" /><path d="M16 9h.01" />
    </svg>
);

export const ChatBubbleLeftRightIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M8 9h8" /><path d="M8 13h6" />
        <path d="M9 18h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-3l-3 3z" />
    </svg>
);

export const CheckBadgeIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 12l2 2l4 -4" />
        <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
    </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M9 12l2 2l4 -4" />
    </svg>
);

export const CheckIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" />
    </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" />
    </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 6l-6 6l6 6" />
    </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" />
    </svg>
);

export const ChevronUpIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 15l6 -6l6 6" />
    </svg>
);

export const ClipboardDocumentListIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" />
        <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" />
        <path d="M9 12l.01 0" /><path d="M13 12l2 0" /><path d="M9 16l.01 0" /><path d="M13 16l2 0" />
    </svg>
);

export const ClockIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 12l0 -3" />
        <path d="M12 7l0 -1" /><path d="M16.5 12l1.5 0" /><path d="M12 16.5l0 1.5" />
        <path d="M7.5 12l-1.5 0" />
    </svg>
);

export const CloudArrowDownIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 18.004h-5.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.483c0 -2.472 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.37 0 2.557 .86 3.033 2.02" />
        <path d="M19 22v-6" /><path d="M22 19l-3 3l-3 -3" />
    </svg>
);

export const Cog8ToothIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 4h6v6h-6z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6h-6z" /><path d="M14 14h6v6h-6z" />
    </svg>
);

export const CpuChipIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M5 5m0 1a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z" />
        <path d="M9 9h6v6h-6z" /><path d="M3 10h2" /><path d="M3 14h2" /><path d="M10 3v2" />
        <path d="M14 3v2" /><path d="M21 10h-2" /><path d="M21 14h-2" /><path d="M14 21v-2" /><path d="M10 21v-2" />
    </svg>
);

export const CubeIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9l8 -4.5" />
      <path d="M12 12l8 -4.5" /><path d="M12 12v9" /><path d="M12 12l-8 -4.5" />
    </svg>
);

export const DocumentDuplicateIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M15 3v4a1 1 0 0 0 1 1h4" /><path d="M18 17h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h4l5 5v7a2 2 0 0 1 -2 2z" />
      <path d="M16 17v2a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h2" />
    </svg>
);

export const DocumentMagnifyingGlassIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M12 21h-5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v4.5" />
        <path d="M16.5 17.5m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" />
        <path d="M18.5 19.5l2.5 2.5" />
    </svg>
);

export const DocumentTextIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
        <path d="M9 9l1 0" /><path d="M9 13l6 0" /><path d="M9 17l6 0" />
    </svg>
);

export const EnvelopeIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" />
      <path d="M3 7l9 6l9 -6" />
    </svg>
);

export const ExclamationTriangleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" />
      <path d="M12 16h.01" />
    </svg>
);

export const EyeIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
    </svg>
);
  
export const EyeSlashIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" />
        <path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87" />
        <path d="M3 3l18 18" />
    </svg>
);

export const FilterIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z" />
    </svg>
);

export const FireIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M12 12c2 -2.96 0 -7 -1 -8c-1 3.038 -1.773 4.741 -3 6c-1.227 1.259 -2.5 3 -2.5 5c0 2.5 2 5 5 5c2.5 0 5 -2.5 5 -5c0 -1.5 -1 -3.5 -2.5 -5z" />
      <path d="M16 12a4 4 0 1 0 -8 0c0 1.5 1 3.5 2.5 5c1.227 1.259 2.5 3 2.5 5" />
    </svg>
);

export const FunnelIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z" />
    </svg>
);

export const GiftIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 8m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z" />
        <path d="M12 8l0 13" /><path d="M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0 -5a2.5 2.5 0 0 1 4.5 1.5" />
        <path d="M16.5 8a2.5 2.5 0 0 0 0 -5a2.5 2.5 0 0 0 -4.5 1.5" />
    </svg>
);

export const GlobeAltIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M3.6 9h16.8" />
        <path d="M3.6 15h16.8" /><path d="M11.5 3a17 17 0 0 0 0 18" />
        <path d="M12.5 3a17 17 0 0 1 0 18" />
    </svg>
);

export const GripVerticalIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    </svg>
);

export const LightBulbIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" />
      <path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" />
      <path d="M9.7 17l4.6 0" />
    </svg>
);

export const LinkIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M10 14a3.5 3.5 0 0 0 5 0l4 -4a3.5 3.5 0 0 0 -5 -5l-.5 .5" />
        <path d="M14 10a3.5 3.5 0 0 0 -5 0l-4 4a3.5 3.5 0 0 0 5 5l.5 -.5" />
    </svg>
);

export const LockClosedIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" />
        <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" />
    </svg>
);

export const MagnifyingGlassIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
        <path d="M21 21l-6 -6" />
    </svg>
);

export const MapPinIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
        <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
    </svg>
);

export const MinusCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 12l6 0" />
    </svg>
);

export const MinusIcon: React.FC<IconProps> = (props) => (
  <svg {...defaultProps} {...props}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M12 3c.132 0 .263 0 .393 .007a7.5 7.5 0 0 1 8.107 8.585a10 10 0 1 1 -8.5 -8.5z" />
    </svg>
);

export const NewspaperIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11" />
        <path d="M8 8l4 0" /><path d="M8 12l4 0" /><path d="M8 16l4 0" />
    </svg>
);

export const PackageIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9l8 -4.5" />
        <path d="M12 12l8 -4.5" /><path d="M12 12v9" /><path d="M12 12l-8 -4.5" /><path d="M16 5.25l-8 4.5" />
    </svg>
);

export const PaperAirplaneIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" />
    </svg>
);

export const PencilIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 20h4l10.5 -10.5a1.5 1.5 0 0 0 -4 -4l-10.5 10.5v4" />
        <path d="M13.5 6.5l4 4" />
    </svg>
);

export const PlusCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 12l6 0" /><path d="M12 9l0 6" />
    </svg>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" />
    </svg>
);

export const QuestionMarkCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M12 16v.01" /><path d="M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />
    </svg>
);

export const ScaleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M7 20l10 0" /><path d="M6 6l6 -1l6 1" /><path d="M12 3v17" />
        <path d="M9 12l-3 -6l-3 6a3 3 0 0 0 6 0" /><path d="M21 12l-3 -6l-3 6a3 3 0 0 0 6 0" />
    </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M9 12l2 2l4 -4" />
        <path d="M12 21l-3 -2a4 4 0 0 1 -1 -6v-4a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v4a4 4 0 0 1 -1 6l-3 2" />
    </svg>
);

export const SparklesIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
      <path d="M8 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
      <path d="M12 10a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
      <path d="M16 6a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
      <path d="M8 6a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2" />
    </svg>
);

export const SunIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
        <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
    </svg>
);

export const TableCellsIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 4h16v16h-16z" /><path d="M4 12h16" /><path d="M12 4v16" />
    </svg>
);

export const TagIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M11 3l9 9a1.5 1.5 0 0 1 0 2l-6 6a1.5 1.5 0 0 1 -2 0l-9 -9v-4a2 2 0 0 1 2 -2h4" />
        <path d="M9 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    </svg>
);

export const TrophyIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M8 21l8 0" /><path d="M12 17l0 4" /><path d="M7 4l10 0" />
        <path d="M17 4v8a5 5 0 0 1 -10 0v-8" /><path d="M5 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
        <path d="M15 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    </svg>
);

export const TruckIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
        <path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5" />
    </svg>
);

export const UserCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" />
    </svg>
);

export const UserGroupIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" />
      <path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M17 10h2a2 2 0 0 1 2 2v1" />
      <path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M3 13v-1a2 2 0 0 1 2 -2h2" />
    </svg>
);

export const UserIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" />
    </svg>
);

export const UserMinusIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M6 21v-2a4 4 0 0 1 4 -4h4" />
        <path d="M16 19h6" />
    </svg>
);
  
export const UserPlusIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" /><path d="M16 19h6" /><path d="M19 16v6" />
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4" />
    </svg>
);

export const UserSlashIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M14 19h-8a4 4 0 0 1 -4 -4v-2a4 4 0 0 1 4 -4h4" />
        <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M16 19h6" />
        <path d="M3 3l18 18" />
    </svg>
);

export const WifiOffIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 18l.01 0" /><path d="M9.172 15.172a4 4 0 0 1 5.656 0" />
        <path d="M6.343 12.343a8 8 0 0 1 11.314 0" /><path d="M3.515 9.515c3.674 -3.674 9.62 -3.674 13.294 0" />
        <path d="M3 3l18 18" />
    </svg>
);

export const XCircleIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
        <path d="M10 10l4 4m0 -4l-4 4" />
    </svg>
);

export const XMarkIcon: React.FC<IconProps> = (props) => (
    <svg {...defaultProps} {...props}>
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" />
    </svg>
);